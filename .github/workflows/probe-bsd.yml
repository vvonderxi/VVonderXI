name: VVonderXI — BSD Enumeration Probe

on:
  workflow_dispatch:

jobs:
  probe:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Probe BSD endpoints
        env:
          BSD_API_KEY: ${{ secrets.BSD_API_KEY }}
        run: node api/probe-bsd.js
