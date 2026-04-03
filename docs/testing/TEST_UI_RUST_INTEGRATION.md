# Test UI Integration for anchor-engine-rust

## Overview

This document outlines the plan to integrate the Test UI (currently in the AEN Node.js project) into the anchor-engine-rust project. The goal is to provide the same frontend testing interface while adapting the backend to run Rust tests.

## Current State (AEN Node.js)

### Frontend
- Single-page React app in `engine/public/index.html`
- Test UI component at `/test` route
- Categories: Unit, Integration, E2E, Emulation, API tests
- Features: Run tests, view output, export results (JSON/Markdown)

### Backend
- Routes in `engine/src/routes/test-ui.ts`
- Endpoints:
  - `GET /v1/test/categories` - List test categories
  - `POST /v1/test/run-file` - Execute test file
  - `POST /v1/test/run` - Run API endpoint tests
- Test execution via `child_process.spawn()`
- Supports: `.ts`, `.js`, `.mjs` files

## Target State (anchor-engine-rust)

### Frontend
- Reuse the same React component from AEN
- Serve from Rust web server (Axum/Actix)
- Same UI/UX, same features

### Backend
- New routes in Rust
- Endpoints:
  - `GET /api/v1/test/categories` - List test categories
  - `POST /api/v1/test/run-file` - Execute Rust test
  - `POST /api/v1/test/run` - Run API endpoint tests
- Test execution via `std::process::Command`
- Supports: `cargo test`, individual test binaries

## Implementation Plan

### Phase 1: Backend Routes (Rust)

#### 1.1 Create Test Routes Module

**File**: `src/routes/test.rs`

```rust
use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::sync::Mutex;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub test_type: String, // "cargo_test", "api_test", "binary"
    pub cargo_args: Option<Vec<String>>,
    pub endpoint: Option<String>,
    pub method: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCategory {
    pub name: String,
    pub icon: String,
    pub tests: Vec<TestDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub name: String,
    pub status: String, // "pass", "fail", "error"
    pub duration: u64,  // milliseconds
    pub message: String,
    pub output: Option<String>,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RunFileRequest {
    pub file: String,
}

#[derive(Debug, Serialize)]
pub struct RunFileResponse {
    pub success: bool,
    pub result: TestResult,
}

// Test categories configuration
fn get_test_categories() -> Vec<TestCategory> {
    vec![
        TestCategory {
            name: "Unit Tests".to_string(),
            icon: "circle-help".to_string(),
            tests: vec![
                TestDefinition {
                    id: "core-tests".to_string(),
                    name: "Core Unit Tests".to_string(),
                    description: "Test core engine functionality".to_string(),
                    test_type: "cargo_test".to_string(),
                    cargo_args: Some(vec!["--lib".to_string()]),
                    endpoint: None,
                    method: None,
                },
                // Add more test definitions...
            ],
        },
        // Add more categories...
    ]
}

// Run a test file/command
async fn run_file_test(file: String) -> TestResult {
    let start = std::time::Instant::now();
    
    // Map file to cargo test command
    let mut cmd = Command::new("cargo");
    cmd.arg("test");
    
    // Add specific test filter if file maps to a test function
    if let Some(test_name) = file_to_test_name(&file) {
        cmd.arg(&test_name);
    }
    
    cmd.arg("--");
    cmd.arg("--nocapture"); // Show stdout/stderr
    
    let output = match cmd.output() {
        Ok(output) => output,
        Err(e) => {
            return TestResult {
                name: file,
                status: "error".to_string(),
                duration: 0,
                message: format!("Failed to spawn cargo test: {}", e),
                output: None,
                exit_code: None,
            };
        }
    };
    
    let duration = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined_output = format!("{}\n{}", stdout, stderr);
    
    let status = if output.status.success() {
        "pass"
    } else {
        "fail"
    };
    
    TestResult {
        name: file,
        status: status.to_string(),
        duration,
        message: if output.status.success() {
            "All tests passed".to_string()
        } else {
            format!("Tests failed with code {:?}", output.status.code())
        },
        output: Some(combined_output.trim().to_string()),
        exit_code: output.status.code(),
    }
}

// Helper to map file path to cargo test name
fn file_to_test_name(file: &str) -> Option<String> {
    // Map "tests/core/test_parser.rs" to "core::test_parser"
    // This is a simplification - you may need custom mapping
    if file.starts_with("tests/") && file.ends_with(".rs") {
        let path = file.trim_start_matches("tests/").trim_end_matches(".rs");
        Some(path.replace("/", "::"))
    } else {
        None
    }
}

// Route handlers
async fn get_categories() -> Json<Vec<TestCategory>> {
    Json(get_test_categories())
}

async fn run_file(
    Json(payload): Json<RunFileRequest>,
) -> Result<Json<RunFileResponse>, StatusCode> {
    let result = run_file_test(payload.file).await;
    Ok(Json(RunFileResponse {
        success: result.status == "pass",
        result,
    }))
}

// API test runner (for testing the Rust API endpoints)
async fn run_api_test(
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<TestResult>, StatusCode> {
    // Similar to Node.js version - make HTTP requests to test endpoints
    // This would use reqwest or similar HTTP client
    todo!("Implement API endpoint testing")
}

// Create router
pub fn create_router() -> Router {
    Router::new()
        .route("/api/v1/test/categories", get(get_categories))
        .route("/api/v1/test/run-file", post(run_file))
        .route("/api/v1/test/run", post(run_api_test))
}
```

#### 1.2 Integrate with Main Router

**File**: `src/routes/mod.rs`

```rust
pub mod test;
// ... other modules

pub fn create_app() -> Router {
    Router::new()
        // ... existing routes
        .merge(test::create_router())
}
```

### Phase 2: Frontend Integration

#### 2.1 Copy React Component

The TestPage component from `aen/engine/public/index.html` can be copied directly into the Rust project's frontend.

**Source**: `aen/engine/public/index.html` (lines ~2725-3202)
**Destination**: `anchor-engine-rust/public/index.html` or equivalent

#### 2.2 Update API Endpoints

The frontend currently calls `/v1/test/*`. Update these to match Rust routes:

**Option A**: Keep same paths in Rust
```rust
.route("/v1/test/categories", get(get_categories))
```

**Option B**: Update frontend to use `/api/v1/test/*`
Modify the fetch calls in TestPage component.

### Phase 3: Test Categories for Rust

Define meaningful test categories for the Rust project:

```rust
fn get_test_categories() -> Vec<TestCategory> {
    vec![
        TestCategory {
            name: "Unit Tests".to_string(),
            icon: "circle-help".to_string(),
            tests: vec![
                TestDefinition {
                    id: "core".to_string(),
                    name: "Core Engine".to_string(),
                    description: "Core engine functionality".to_string(),
                    test_type: "cargo_test".to_string(),
                    cargo_args: Some(vec!["--lib".to_string(), "core".to_string()]),
                    endpoint: None,
                    method: None,
                },
                TestDefinition {
                    id: "atomizer".to_string(),
                    name: "Atomizer".to_string(),
                    description: "Content atomization".to_string(),
                    test_type: "cargo_test".to_string(),
                    cargo_args: Some(vec!["--lib".to_string(), "atomizer".to_string()]),
                    endpoint: None,
                    method: None,
                },
            ],
        },
        TestCategory {
            name: "Integration Tests".to_string(),
            icon: "layers".to_string(),
            tests: vec![
                TestDefinition {
                    id: "database".to_string(),
                    name: "Database Integration".to_string(),
                    description: "Database operations".to_string(),
                    test_type: "cargo_test".to_string(),
                    cargo_args: Some(vec!["--test".to_string(), "database".to_string()]),
                    endpoint: None,
                    method: None,
                },
            ],
        },
        TestCategory {
            name: "API Tests".to_string(),
            icon: "cpu".to_string(),
            tests: vec![
                TestDefinition {
                    id: "health".to_string(),
                    name: "Health Check".to_string(),
                    description: "Server health endpoint".to_string(),
                    test_type: "api_test".to_string(),
                    cargo_args: None,
                    endpoint: Some("/health".to_string()),
                    method: Some("GET".to_string()),
                },
                TestDefinition {
                    id: "stats".to_string(),
                    name: "Statistics".to_string(),
                    description: "Database statistics".to_string(),
                    test_type: "api_test".to_string(),
                    cargo_args: None,
                    endpoint: Some("/v1/stats".to_string()),
                    method: Some("GET".to_string()),
                },
            ],
        },
    ]
}
```

### Phase 4: Enhanced Features

#### 4.1 Parallel Test Execution

```rust
use tokio::task::JoinSet;

async fn run_category_tests(category: &TestCategory) -> Vec<TestResult> {
    let mut set = JoinSet::new();
    
    for test in &category.tests {
        let test_clone = test.clone();
        set.spawn(async move {
            run_file_test(test_clone.id).await
        });
    }
    
    let mut results = Vec::new();
    while let Some(result) = set.join_next().await {
        if let Ok(r) = result {
            results.push(r);
        }
    }
    
    results
}
```

#### 4.2 Live Output Streaming (SSE)

```rust
use axum::response::sse::{Event, KeepAlive, Sse};
use tokio_stream::wrappers::ReceiverStream;

async fn run_test_streaming(
    Json(payload): Json<RunFileRequest>,
) -> Sse<ReceiverStream<Result<Event, Infallible>>> {
    let (tx, rx) = tokio::sync::mpsc::channel(100);
    
    tokio::spawn(async move {
        // Run test and stream output
        let mut cmd = Command::new("cargo")
            .arg("test")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        
        // Stream stdout line by line
        // Send SSE events for each line
    });
    
    let stream = ReceiverStream::new(rx);
    Sse::new(stream).keep_alive(KeepAlive::default())
}
```

### Phase 5: Testing the Integration

1. **Start Rust server**: `cargo run`
2. **Navigate to Test UI**: `http://localhost:3160/test`
3. **Run individual tests**: Verify output appears correctly
4. **Run categories**: Check parallel execution
5. **Export results**: Test JSON and Markdown export
6. **Verify timeouts**: Long tests should timeout at 5 minutes

## File Structure

```
anchor-engine-rust/
├── src/
│   ├── routes/
│   │   ├── mod.rs          # Add test module
│   │   └── test.rs         # New: Test routes
│   └── main.rs
├── tests/
│   ├── core/
│   │   └── test_parser.rs
│   ├── integration/
│   │   └── test_database.rs
│   └── e2e/
│       └── full_stack.rs
├── public/
│   └── index.html          # Include TestPage component
└── Cargo.toml
```

## Migration Checklist

- [ ] Create `src/routes/test.rs` with route handlers
- [ ] Define test categories for Rust project
- [ ] Implement `run_file_test()` for cargo test execution
- [ ] Add routes to main router
- [ ] Copy TestPage component to public/index.html
- [ ] Update API endpoint paths if needed
- [ ] Test individual test execution
- [ ] Test category execution
- [ ] Test export functionality
- [ ] Add timeout handling
- [ ] Add error handling
- [ ] Document in README

## Differences from Node.js Version

| Feature | Node.js | Rust |
|---------|---------|------|
| Test runner | `node`, `tsx` | `cargo test` |
| File types | `.ts`, `.js`, `.mjs` | `.rs` |
| Process spawn | `child_process` | `std::process::Command` |
| Async runtime | Native | Tokio |
| Output parsing | String parsing | Structured (cargo --message-format=json) |

## Benefits of Rust Implementation

1. **Faster test execution** - No Node.js startup overhead
2. **Better memory efficiency** - No V8 heap
3. **Structured output** - Cargo JSON message format
4. **Native concurrency** - Tokio async runtime
5. **Type safety** - Compile-time guarantees

## Next Steps

1. Review and approve this plan
2. Implement Phase 1 (backend routes)
3. Implement Phase 2 (frontend integration)
4. Test and iterate
5. Deploy to production
