# sample request curl for onchain schema definition:
```
postman request POST 'http://speedtest.param.network:8450/api/pipelines/pipe%3Asys%3Adefine-offchain-schema-v1/execute?dryRun=false' \
  --header 'Accept: */*' \
  --header 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Origin: http://speedtest.param.network:8450' \
  --header 'Referer: http://speedtest.param.network:8450/' \
  --header 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  --header 'X-Gateway-Role: admin' \
  --header 'X-Workspace: test-exchange' \
  --header 'Cookie: gateway-theme=light; gateway-role=admin; mongo-express=s%3A_iK61V4HDx4OSFwmKVqmzzTIg6dRtdI0.1qoB4DWb5%2Fw7X5sUAJvPLtxeoX6O%2BR3kFJgbCHuCm5s' \
  --body '[
      {
        "defId": "public:0xf02dbb306c36a2b32d41e14435fbf03cb32782f26458569ac2ea4ba9974b1f1e",
        "displayName": "Entity-Division-Plant Master",
        "desc": "Off-chain registry schema for Entity-Division-Plant Master",
        "version": "1.0",
        "properties": {
            "EntDivPlant": {
                "type": "object",
                "desc": "Entity division plant details",
                "properties": {
                    "Entity": {
                        "type": "string",
                        "required": true,
                        "title": "Entity",
                        "order": 1
                    },
                    "Division": {
                        "type": "string",
                        "required": true,
                        "title": "Divsion/GB",
                        "order": 2
                    },
                    "Plant": {
                        "type": "string",
                        "required": true,
                        "title": "Plant",
                        "order": 3
                    },
                    "Consignee": {
                        "type": "string",
                        "required": true,
                        "title": "Consignee Name",
                        "order": 4
                    }
                }
            }
        }
    }
]'
```

# sample response format for onchain schema definition:
```
{
    "status": "accepted",
    "data": {
        "batchCount": 1,
        "batchIds": [
            "3ac8ee90-1b69-4865-b5bf-cab3a3c2ec7e"
        ],
        "batchSize": 1,
        "dryRun": false,
        "status": "running",
        "totalDocs": 1
    }
}
```

# mongodb storage for onchain schema definition:
```
  {
        "_id": "public:0xf02dbb306c36a2b32d41e14435fbf03cb32782f26458569ac2ea4ba9974b1f1e",
        "defId": "public:0xf02dbb306c36a2b32d41e14435fbf03cb32782f26458569ac2ea4ba9974b1f1e",
        "displayName": "Entity-Division-Plant Master",
        "desc": "Off-chain registry schema for Entity-Division-Plant Master",
        "version": "1.0",
        "properties": {
            "EntDivPlant": {
                "type": "object",
                "desc": "Entity division plant details",
                "properties": {
                    "Entity": {
                        "type": "string",
                        "required": true,
                        "title": "Entity",
                        "order": 1
                    },
                    "Division": {
                        "type": "string",
                        "required": true,
                        "title": "Divsion/GB",
                        "order": 2
                    },
                    "Plant": {
                        "type": "string",
                        "required": true,
                        "title": "Plant",
                        "order": 3
                    },
                    "Consignee": {
                        "type": "string",
                        "required": true,
                        "title": "Consignee Name",
                        "order": 4
                    }
                }
            }
        }
    }
```