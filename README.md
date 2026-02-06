# pcurl

**Does alternatives exist?** Yes.
**But do I want to use them?** No.
**So I built one.**

Simply switch `curl` with `pcurl` and enjoy beautiful, highlighted JSON output automatically.

## Installation

```bash
git clone <your-repo-url>
cd pcurl
bun install
bun link
```

## Usage

It works just like `curl`, but better.

### Basic GET Request
```bash
pcurl https://jsonplaceholder.typicode.com/todos/1
```

### POST Request with Headers & Data
```bash
pcurl https://api.example.com/data \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Why?
Because standard `curl` JSON output is ugly and unreadable. `pcurl` formats and colorizes it for you.
