module.exports = {
  describe: "early return",
  coverageV8: {
    "scriptId": "61",
    "url": "./test/fixtures/scripts/early.return.js",
    "functions": [
      {
        "functionName": "",
        "ranges": [
          {
            "startOffset": 0,
            "endOffset": 112,
            "count": 1
          }
        ],
        "isBlockCoverage": true
      },
      {
        "functionName": "test",
        "ranges": [
          {
            "startOffset": 0,
            "endOffset": 97,
            "count": 1
          },
          {
            "startOffset": 44,
            "endOffset": 96,
            "count": 0
          }
        ],
        "isBlockCoverage": true
      },
      {
        "functionName": "bar",
        "ranges": [
          {
            "startOffset": 50,
            "endOffset": 95,
            "count": 1
          }
        ],
        "isBlockCoverage": true
      }
    ]
  }
};