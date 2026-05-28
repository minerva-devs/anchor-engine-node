# Research Report: Control Layer for Local LLM Tool Calls

## Executive Summary

This report investigates how to build a control layer that sits between your LM Studio (Qwen 3.5 9B) and your QwenPaw agent, specifically to handle:

1. **Thinking block escaping** - Tool calls getting trapped inside `<!think>` blocks
2. **Small model syntax struggles** - Complex nested tool call structures
3. **Windows terminal compatibility** - Non-native command execution failures  
4. **Auto-retry and correction** - Recovering from malformed outputs

**Key Finding**: The control layer concept from the article (InputGuard, ResponseValidator, RetryEngine, FallbackRouter) can be implemented as an MCP server or middleware layer that intercepts, validates, repairs, and re-sends tool calls before they reach the LM Studio API.

**Bottom Line**: YES, a control layer will absolutely help you use tiny models with successful tool calls. The article proves this with a real-world benchmark: naive system had 0% pass rate, control layer achieved 100% pass rate — without changing the model or prompts.

---

## Key Findings

### 1. Thinking Block Escaping Problem (Your Main Issue)

**The Issue**: Small models like Qwen 3.5 9B often fail to properly escape tool calls from thinking blocks, resulting in:
- Tool calls becoming part of the thinking text rather than structured output
- The tool harness ignoring them (no JSON/function call detected)
- Silent failures that only surface later in the conversation

**Root Cause**: The model's internal attention mechanisms struggle with the meta-concept of "nested structured syntax within another structured syntax." This isn't a bug—it's a fundamental limitation of small models with complex reasoning.

**Solutions from Research**:
- **ResponseValidator**: Extract thinking blocks, find trapped tool calls, validate and repair them
- **Pattern matching**: Look for common tool call patterns even inside thinking text
- **Syntax repair**: Automatically fix JSON escaping issues

### 2. Control Layer Architecture (From Article)

The article describes an **8-component system**:

1. **InputGuard** - Validates input before model processing
2. **TokenBudget** - Manages context window limits
3. **PromptBuilder** - Constructs optimal prompts for small models
4. **ResponseValidator** - **Checks outputs before using them** (your main need!)
5. **CircuitBreaker** - Stops cascading failures
6. **RetryEngine** - Automatically retries with corrections
7. **FallbackRouter** - Routes to simpler approaches when needed
8. **AuditLogger** - Tracks failures for improvement

**The breakthrough**: "Naive system: 0% pass rate, Control layer: 100% pass rate" — **without changing the model or prompts**.

### 3. ResponseValidator Implementation Strategy

**For your use case, ResponseValidator is the critical component**. It works by:

```python
async def validate_response(model_response):
    # Step 1: Parse thinking blocks (if any)
    thinking_content = extract_thinking(model_response)
    
    # Step 2: Find tool calls in thinking blocks
    trapped_tool_calls = find_trapped_tool_calls(thinking_content)
    
    # Step 3: Extract valid tool call structure
    for trapped_call in trapped_tool_calls:
        repaired_call = parse_and_repair(trapped_call)
        if repaired_call is not None:
            # Return this as the actual tool call
            return repaired_call
    
    # Step 4: Validate remaining output (normal path)
    remaining_output = extract_tool_calls(model_response)
    
    # Step 5: Run validation checks on all calls
    valid_calls = []
    for call in remaining_output:
        if validates(call):
            valid_calls.append(call)
    
    return valid_calls + repaired_calls
```

### 4. MCP Server vs. Middleware Approach

**Can this be an MCP server?** Yes, and here's how:

**Option A: MCP Server** (cleaner protocol)
```python
class ControlLayerMCP:
    async def call_tool(self, root, request, _mcp_context, _mcp_request):
        # Intercept tool calls, validate/repair them
        result = await self.handle_tool_call(request.params)
        return mcp.CallToolResult(
            content=[mcp.TextContent(text=str(result))]
        )
```

**Option B: Middleware** (simpler, recommended)
```python
async def lmstudio_middleware_with_control_layer:
    async def wrapper(request):
        # 1. Validate request (InputGuard)
        request = validate_request(request)
        
        # 2. Call LM Studio
        response = await lmstudio_call(request)
        
        # 3. Validate and repair response (ResponseValidator + RetryEngine)
        repaired_response = await validate_and_repair(response)
        
        # 4. Return (with audit logging)
        return repaired_response
    
    return wrapper
```

**Recommendation**: Start with **middleware approach** for your QwenPaw agent. It's simpler and doesn't require MCP client libraries.

### 5. Windows Terminal Compatibility

The article doesn't specifically address Windows, but the patterns apply:

**Problem**: LM Studio's Windows tools (cmd/PowerShell) are often not native implementations. They may:
- Fail silently
- Return non-standard error codes
- Have incompatible JSON formats

**Solution**: Your control layer should:
1. **Validate command execution results** before returning to model
2. **Normalize error responses** into a standard format
3. **Retry failed commands** with alternative syntax
4. **Fall back** to Python subprocess (native, reliable) when Windows tools fail

### 6. Auto-Retry Mechanism

**What happens when tool call is "escaped incorrectly"**:  

```python
async def auto_retry_with_repair(model_response):
    # First attempt: parse normally
    tool_calls = extract_tool_calls(model_response)
    
    # If no valid calls found but thinking block exists, try thinking block extraction
    if not tool_calls and has_thinking_block(model_response):
        thinking_content = extract_thinking(model_response)
        trapped_calls = extract_tool_calls_from_thinking(thinking_content)
        
        if trapped_calls:
            # These are your "escaped incorrectly" tool calls
            # They need to be repaired and re-submitted
            for call in trapped_calls:
                call = repair_tool_call_syntax(call)
                return await retry_tool_execution(call)
    
    # Second attempt: validation + auto-correction
    for call in tool_calls:
        if call is malformed or invalid:
            call = auto_correct(call)
            return await retry_tool_execution(call)
    
    # Third attempt: fallback to simpler prompt
    return await fallback_to_simpler_approach()
```

---

## Implementation Recommendations

### Immediate Next Steps

1. **Build ResponseValidator first** - This solves your primary problem (thinking block escaping)
2. **Create LM Studio middleware wrapper** - Intercepts requests/responses, adds control layer
3. **Implement Windows terminal normalization** - Wrap your command execution with validation
4. **Add auto-retry logic** - Once validation works, retrying becomes easy
5. **Consider MCP only if needed** - Middleware is simpler; use MCP if you want protocol standardization

### Code Example: Minimal Control Layer

```python
import json
import re
from typing import List, Optional, Dict

async def control_layer_response_handler(model_response: str) -> List[Dict]:
    """Core control layer: validates, repairs, and returns tool calls."""
    
    # === ResponseValidator ===
    thinking_content = extract_thinking_block(model_response)
    if thinking_content:
        trapped_calls = find_trapped_tool_calls(thinking_content)
        repaired = [repair_call(call) for call in trapped_calls]
        if repaired:
            print(f"Recovered {len(repaired)} tool calls from thinking block")
            return repaired
    
    # === Normal extraction ===
    tool_calls = extract_standard_tool_calls(model_response)
    valid = [validate_and_normalize(call) for call in tool_calls]
    
    # === RetryEngine equivalent ===
    failed = [call for call in valid if not call.executed_successfully]
    if failed:
        for call in failed:
            repaired = repair_call_syntax(call)
            if repaired:
                call = repaired
    
    return valid

# === Thinking block extraction ===
def extract_thinking_block(response: str) -> Optional[str]:
    """Extract content between <!think> and </!think>"""
    pattern = r"<\!think>.*?</\!think>"
    match = re.search(pattern, response, re.DOTALL)
    return match.group(0) if match else None

# === Trapped tool call extraction ===
def find_trapped_tool_calls(thinking: str) -> List[Dict]:
    """Find JSON/function calls that were trapped in thinking text."""
    patterns = [
        r'"name"\s*:\s*"[^\"]+"',  # Has tool name
        r'"arguments"\s*:\s*\{[^}]*\}',  # Has arguments object
    ]
    
    candidate_matches = re.findall('|'.join(patterns), thinking, re.DOTALL)
    
    repaired = []
    for candidate in candidate_matches:
        try:
            call = attempt_parse_and_repair(candidate)
            if call:
                repaired.append(call)
        except Exception as e:
            pass
    
    return repaired

# === Repair attempt ===
def attempt_parse_and_repair(candidate: str) -> Optional[Dict]:
    """Try to parse a tool call candidate, repair if needed."""
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass
    
    try:
        parts = extract_function_call_parts(candidate)
        return {
            "name": parts["name"],
            "arguments": parse_arguments(parts["arguments"])
        }
    except Exception:
        pass
    
    return None

# === Validation ===
def validate_and_normalize(call: Dict) -> Optional[Dict]:
    """Validate tool call structure and normalize."""
    required_fields = {"name", "arguments"}
    if not all(field in call for field in required_fields):
        return None
    
    if "arguments" in call:
        if isinstance(call["arguments"], str):
            try:
                call["arguments"] = json.loads(call["arguments"])
            except json.JSONDecodeError:
                call["arguments"] = repair_stringified_json(call["arguments"])
        
        if not isinstance(call["arguments"], dict):
            return None
    
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', call["name"]):
        return None
    
    return call
```

---

## Gaps & Next Steps

### What We Couldn't Cover (Without More Info)

1. **Your specific tool definitions** - What tools do you want to call? (file operations, shell, database, etc.)
2. **LM Studio API endpoint** - Are you using the standard `/v1/chat/completions` or a custom endpoint?
3. **QwenPaw agent codebase** - Where in your agent should this control layer sit? (API layer, message handler, etc.)
4. **Error handling requirements** - Should the control layer be silent, or report its interventions?

### Recommended Next Steps

1. **Implement the ResponseValidator first** - This is your highest priority. It handles the thinking block escaping issue directly.
2. **Build a simple LM Studio client wrapper** - Use the middleware approach to intercept requests/responses. Start with just ResponseValidator.
3. **Add Windows terminal normalization** - Create a utility that wraps your Windows command execution and normalizes the output.
4. **Consider MCP only if needed** - The middleware approach is simpler and doesn't require MCP clients. Use MCP if you want to share this control layer with other projects.
5. **Auto-retry after ResponseValidator** - Once you have reliable extraction, add the retry logic. This is much easier than it sounds.

### Specific Tools/Patterns You Should Research

- **Pydantic** - For JSON schema validation and automatic repair
- **LangChain/LangGraph** - For building control layer pipelines
- **OpenTelemetry** - For audit logging (from the article's AuditLogger)
- **MCP SDK** - If you decide on MCP server approach

---

## Conclusion

**Yes, a control layer will absolutely help you use tiny models with successful tool calls.** The key insight from the article is that **you don't need to change the model or prompts** — you just need to intercept, validate, and repair the outputs.

**Your immediate next step**: Build a simple ResponseValidator that:
1. Extracts thinking blocks
2. Finds trapped tool calls
3. Validates and repairs them
4. Returns the corrected tool calls

This single component solves your primary problem (thinking block escaping) and gives you the foundation to build the rest (retry, validation, auto-correction).

**Let me know if you'd like me to**:
1. Write a more detailed implementation guide for the ResponseValidator
2. Create a full MCP server implementation
3. Research specific Windows terminal handling patterns
4. Analyze your QwenPaw codebase for integration points
