# sample request curl for onchain sm definition:
```
postman request POST 'http://speedtest.param.network:8450/api/pipelines/pipe%3Asys%3Adefine-sm-v1/execute?dryRun=false' \
  --header 'Accept: */*' \
  --header 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Origin: http://speedtest.param.network:8450' \
  --header 'Referer: http://speedtest.param.network:8450/' \
  --header 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  --header 'X-Gateway-Role: admin' \
  --header 'X-Workspace: test-exchange' \
  --header 'Cookie: mongo-express=s%3A14GADYVhrCYnK_Zab7MRk1ORcshtYlBl.QQE%2F6xsI7vMDmWdMSo9%2BGVlkxa1sUaUOnnKKcDhSqlA; gateway-theme=light; gateway-role=admin' \
  --body '[
    {
        "defId": "public:0x0a28b0081c9e250d35239460f5505754b4713882a97b6c9ee023d4576f7da278",
        "smType": "@sm/Commerce",
        "displayName": "HSN Queries",
        "desc": "HSN Workflow for SaaS EXIM",
        "phaseMapping": {
            "Initiation": [
                "HSN"
            ],
            "Agreement": [],
            "Execution": [],
            "Settlement": [],
            "Completion": []
        },
        "roles": [
            "Consignee",
            "FF",
            "CHA"
        ],
        "startAt": "HSN",
        "states": {
            "HSN": {
                "desc": "HSN WF",
                "phase": "Initiation",
                "schema": "public:0xa59ea6cb61a5167445f8217521aa6caa3659ecb97769774449fbe0b5796b9776",
                "end": true,
                "owner": [
                    "Consignee"
                ],
                "visibility": [
                    "Consignee",
                    "FF",
                    "CHA"
                ],
                "props": {
                    "edit": true,
                    "flip": false,
                    "diff": true
                },
                "subStates": {
                    "Request": {
                        "start": true,
                        "owner": [
                            "Consignee"
                        ],
                        "nextState": "Update"
                    },
                    "Update": {
                        "owner": [
                            "Consignee"
                        ],
                        "nextState": "Approval",
                        "microStates": {
                            "PlannerRequest": {
                                "desc": "Planner Request",
                                "owner": [
                                    "Consignee"
                                ],
                                "nextState": "PlannerUpdate"
                            },
                            "PlannerUpdate": {
                                "desc": "Planner Update",
                                "owner": [
                                    "Consignee"
                                ],
                                "nextState": "TaxRequest"
                            },
                            "TaxRequest": {
                                "desc": "Tax Request",
                                "owner": [
                                    "Consignee"
                                ],
                                "nextState": "TaxUpdate"
                            },
                            "TaxUpdate": {
                                "end": true,
                                "desc": "Tax Update",
                                "owner": [
                                    "Consignee"
                                ]
                            },
                            "Request": {
                                "start": true,
                                "desc": "HSN Requested",
                                "owner": [
                                    "Consignee"
                                ],
                                "nextState": "TechRequest"
                            },
                            "TechRequest": {
                                "desc": "Tech Request",
                                "owner": [
                                    "Consignee"
                                ],
                                "nextState": "TechUpdate"
                            },
                            "TechUpdate": {
                                "desc": "Tech Update",
                                "owner": [
                                    "Consignee"
                                ],
                                "nextState": "PlannerRequest"
                            }
                        }
                    },
                    "Approval": {
                        "end": true,
                        "owner": [
                            "Consignee"
                        ]
                    }
                }
            }
        }
    }
]'
```

# sample response format for onchain sm definition:
```
{
    "status": "accepted",
    "data": {
        "batchCount": 1,
        "batchIds": [
            "31838ac9-0a46-445b-8f8a-680e7d201d17"
        ],
        "batchSize": 1,
        "dryRun": false,
        "status": "running",
        "totalDocs": 1
    }
}
```

# mongodb storage for onchain sm definition:
```
  {
    "_id": "public:0x0a28b0081c9e250d35239460f5505754b4713882a97b6c9ee023d4576f7da278",
    "defId": "public:0x0a28b0081c9e250d35239460f5505754b4713882a97b6c9ee023d4576f7da278",
    "smType": "@sm/Commerce",
    "displayName": "HSN Queries",
    "desc": "HSN Workflow for SaaS EXIM",
    "phaseMapping": {
      "Initiation": [
        "HSN"
      ],
      "Agreement": [],
      "Execution": [],
      "Settlement": [],
      "Completion": []
    },
    "roles": [
      "Consignee",
      "FF",
      "CHA"
    ],
    "startAt": "HSN",
    "states": {
      "HSN": {
        "desc": "HSN WF",
        "phase": "Initiation",
        "schema": "public:0xa59ea6cb61a5167445f8217521aa6caa3659ecb97769774449fbe0b5796b9776",
        "end": true,
        "owner": [
          "Consignee"
        ],
        "visibility": [
          "Consignee",
          "FF",
          "CHA"
        ],
        "props": {
          "edit": true,
          "flip": false,
          "diff": true
        },
        "subStates": {
          "Request": {
            "start": true,
            "owner": [
              "Consignee"
            ],
            "nextState": "Update"
          },
          "Update": {
            "owner": [
              "Consignee"
            ],
            "nextState": "Approval",
            "microStates": {
              "PlannerRequest": {
                "desc": "Planner Request",
                "owner": [
                  "Consignee"
                ],
                "nextState": "PlannerUpdate"
              },
              "PlannerUpdate": {
                "desc": "Planner Update",
                "owner": [
                  "Consignee"
                ],
                "nextState": "TaxRequest"
              },
              "TaxRequest": {
                "desc": "Tax Request",
                "owner": [
                  "Consignee"
                ],
                "nextState": "TaxUpdate"
              },
              "TaxUpdate": {
                "end": true,
                "desc": "Tax Update",
                "owner": [
                  "Consignee"
                ]
              },
              "Request": {
                "start": true,
                "desc": "HSN Requested",
                "owner": [
                  "Consignee"
                ],
                "nextState": "TechRequest"
              },
              "TechRequest": {
                "desc": "Tech Request",
                "owner": [
                  "Consignee"
                ],
                "nextState": "TechUpdate"
              },
              "TechUpdate": {
                "desc": "Tech Update",
                "owner": [
                  "Consignee"
                ],
                "nextState": "PlannerRequest"
              }
            }
          },
          "Approval": {
            "end": true,
            "owner": [
              "Consignee"
            ]
          }
        }
      }
    }
  }
```