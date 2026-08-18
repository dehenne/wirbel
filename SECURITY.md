# Security policy

## Supported versions

Security fixes are provided for the latest published version of Wirbel.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Report it
through [GitHub private vulnerability reporting](https://github.com/dehenne/wirbel/security/advisories/new)
and include:

- the affected Wirbel version;
- the operating system and Node.js version;
- clear reproduction steps;
- the potential impact;
- any suggested mitigation, if available.

You should receive an initial response within seven days. Please allow time for
a fix and coordinated release before disclosing the issue publicly.

## Untrusted Strudel files

Strudel source is executable JavaScript-based live-coding code. Wirbel uses a
temporary browser profile, but it does not provide a hardened sandbox for
hostile input. Only render `.strudel` files from sources you trust.
