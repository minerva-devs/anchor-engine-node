#!/usr/bin/env python3
"""
Verify temporal decay calculations in STAR algorithm.
Timestamps are stored as milliseconds (Date.now()).
Lambda = 0.0001 s^-1.
"""
import math

LAMBDA = 0.0001  # per second

def decay_with_units(delta_ms, lambda_per_sec=LAMBDA):
    """Compute decay factor e^{-λ Δt} where Δt is in seconds."""
    delta_seconds = delta_ms / 1000.0
    return math.exp(-lambda_per_sec * delta_seconds)

def decay_current_code(delta_ms, lambda_per_sec=LAMBDA):
    """Compute decay factor as currently implemented: e^{-λ Δt_ms}."""
    return math.exp(-lambda_per_sec * delta_ms)

def half_life(lambda_val):
    """Compute half-life in seconds."""
    return math.log(2) / lambda_val

print("=== Temporal Decay Verification ===")
print(f"Lambda = {LAMBDA} s^-1")
print(f"Half-life (seconds): {half_life(LAMBDA):.1f}")
print(f"Half-life (minutes): {half_life(LAMBDA)/60:.1f}")
print(f"Half-life (hours): {half_life(LAMBDA)/3600:.2f}")
print()
print("Decay factors for various time differences:")
print("Delta t (hours) | Delta t (ms)      | Decay (correct) | Decay (current) | Ratio")
print("-" * 80)
for hours in [0.1, 0.5, 1, 2, 6, 12, 24]:
    delta_ms = hours * 3600 * 1000
    decay_correct = decay_with_units(delta_ms)
    decay_current = decay_current_code(delta_ms)
    ratio = decay_current / decay_correct if decay_correct > 0 else 0
    print(f"{hours:10.1f} | {delta_ms:12.0f} | {decay_correct:15.6f} | {decay_current:15.6f} | {ratio:10.2e}")
print()
print("Check half-life with current code (solve e^{-λ Δt_ms} = 0.5):")
lambda_ms = LAMBDA  # per millisecond? Actually λ in code multiplies milliseconds
half_life_ms = math.log(2) / lambda_ms
print(f"Half-life in milliseconds: {half_life_ms:.1f}")
print(f"Half-life in seconds: {half_life_ms / 1000:.1f}")
print(f"Half-life in minutes: {half_life_ms / 60000:.1f}")
print()
print("If timestamps are milliseconds, required lambda for 115 min half-life:")
desired_half_life_ms = 115 * 60 * 1000
required_lambda_per_ms = math.log(2) / desired_half_life_ms
required_lambda_per_sec = required_lambda_per_ms * 1000
print(f"Required lambda per ms: {required_lambda_per_ms:.2e}")
print(f"Required lambda per sec: {required_lambda_per_sec:.6f}")
print(f"Current lambda per sec: {LAMBDA:.6f}")
print(f"Current lambda per ms: {LAMBDA:.6f} (same as per sec in code)")
print()
print("Conclusion: Need to divide timestamp difference by 1000 in SQL.")