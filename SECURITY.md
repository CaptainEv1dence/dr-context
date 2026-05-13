# Security Policy

## Supported versions

Dr. Context has not published a stable release yet. Until `1.0.0`, security fixes will target the latest development branch and the latest published prerelease, if any.

## Reporting a vulnerability

Please do not open a public issue for vulnerabilities.

Report security issues by emailing the maintainer listed in the package metadata once the project is published. Until then, use a private GitHub security advisory in the upstream repository.

Include:

- affected version or commit;
- operating system and Node.js version;
- reproduction steps;
- expected and actual behavior;
- whether the issue can expose secrets or modify user files.

## Security boundaries

- Dr. Context is local-first and read-only by default.
- v0.1 must not call network or LLM APIs.
- Findings must not print secrets from scanned repositories.
- Checks must remain pure and must not perform filesystem, process, or network side effects.
