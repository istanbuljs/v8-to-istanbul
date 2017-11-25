module.exports = {
  describe: 'functions',
  coverageV8: {
    "scriptId": "71",
    "url": "./test/fixtures/scripts/functions.js",
    "functions": [
      {
        "functionName": "",
        "ranges": [
          {
            "startOffset": 0,
            "endOffset": 790,
            "count": 1
          }
        ],
        "isBlockCoverage": true
      },
      {
        "functionName": "",
        "ranges": [
          {
            "startOffset": 1,
            "endOffset": 788,
            "count": 1
          }
        ],
        "isBlockCoverage": true
      },
      {
        "functionName": "a",
        "ranges": [
          {
            "startOffset": 93,
            "endOffset": 162,
            "count": 0
          }
        ],
        "isBlockCoverage": false
      },
      {
        "functionName": "b",
        "ranges": [
          {
            "startOffset": 198,
            "endOffset": 315,
            "count": 1
          },
          {
            "startOffset": 242,
            "endOffset": 251,
            "count": 0
          },
          {
            "startOffset": 292,
            "endOffset": 297,
            "count": 0
          },
          {
            "startOffset": 311,
            "endOffset": 314,
            "count": 0
          }
        ],
        "isBlockCoverage": true
      },
      {
        "functionName": "c",
        "ranges": [
          {
            "startOffset": 374,
            "endOffset": 423,
            "count": 2
          }
        ],
        "isBlockCoverage": true
      },
      {
        "functionName": "Foo",
        "ranges": [
          {
            "startOffset": 510,
            "endOffset": 537,
            "count": 0
          }
        ],
        "isBlockCoverage": false
      },
      {
        "functionName": "hello",
        "ranges": [
          {
            "startOffset": 546,
            "endOffset": 580,
            "count": 0
          }
        ],
        "isBlockCoverage": false
      },
      {
        "functionName": "Bar",
        "ranges": [
          {
            "startOffset": 657,
            "endOffset": 688,
            "count": 1
          }
        ],
        "isBlockCoverage": true
      },
      {
        "functionName": "hello",
        "ranges": [
          {
            "startOffset": 699,
            "endOffset": 750,
            "count": 1
          }
        ],
        "isBlockCoverage": true
      }
    ]
  },
  assertions: [
    {
      describe: 'function that is not executed',
      lines: [
        {
          start: 2,
          end: 6,
          count: 0
        }
      ]
    },
    {
      describe: 'function that is called once',
      lines: [
        {
          startLine: 9,
          endLine: 14,
          count: 1
        }
      ],
      branches: [
        {
          startLine: 10,
          startCol: 28,
          endLine: 10,
          endCol: 37,
          count: 0
        }
      ]
    },
    {
      describe: "function that's called multiple times",
      lines: [
        {
          startLine: 20,
          endLine: 22,
          count: 2
        }
      ]
    },
    {
      describe: 'class that never has member functions called',
      lines: [
        {
          startLine: 30,
          endLine: 30,
          count: 0
        },
        {
          startLine: 33,
          endLine: 33,
          count: 0
        }
      ]
    },
    {
      describe: 'class that has member functions called',
      lines: [
        {
          startLine: 38,
          endLine: 45,
          count: 1
        }
      ]
    }
  ]
}
