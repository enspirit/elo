# Security fix

Dear Elo Security Team,

I am writing to report a critical security vulnerability in the Elo compiler that allows for Remote Code Execution (RCE). While the Elo parser is strict, the library's programmatic AST construction API is vulnerable to code injection, which completely bypasses the "No host access" security guarantee.
Summary

The compileToJavaScript function fails to escape single quotes (') when emitting code for certain literal types (specifically DateLiteral). An attacker can craft a malicious string that breaks out of the JavaScript string literal and executes arbitrary code on the host server.
Vulnerability Details

In elo/src/compilers/javascript.ts, the emitter uses simple string interpolation for date_literal values without sanitization. When a developer builds an AST using the provided dateLiteral() helper with unsanitized input (e.g., from a web form or API), the generated JavaScript code becomes executable.
Impact

This vulnerability allows for a full sandbox escape. An attacker can:

    Execute arbitrary Node.js code on the server (RCE).

    Access the host file system (via require('fs')).

    Perform Denial of Service (DoS) (via process.exit()).

## Proof of Concept (PoC)

To ensure the code is easy to review, I have uploaded a minimal reproduction script to a secret Gist. This script demonstrates how the payload successfully escapes the sandbox and can execute host-level commands like process.exit().

Secret Gist URL: https://gist.github.com/naoyashiga/316b8ed964c7c1edd50711f8f02b4fe5
Recommended Fix

All string-based literals in the emitter should be sanitized using JSON.stringify() to ensure that no input can break the literal boundary.

// Proposed fix in elo/src/compilers/javascript.ts
case 'date_literal':
  return `DateTime.fromISO(${JSON.stringify(ir.value)})`;
