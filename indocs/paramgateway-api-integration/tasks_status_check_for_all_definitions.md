# sample request curl for task status check:
```
curl 'http://speedtest.param.network:8450/api/batches/b5bf4409-fbf9-4d6a-8764-c266033d7bdd/tasks' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'Connection: keep-alive' \
  -b 'gateway-theme=light; gateway-role=admin; mongo-express=s%3A_iK61V4HDx4OSFwmKVqmzzTIg6dRtdI0.1qoB4DWb5%2Fw7X5sUAJvPLtxeoX6O%2BR3kFJgbCHuCm5s' \
  -H 'Referer: http://speedtest.param.network:8450/' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  -H 'X-Gateway-Role: admin' \
  -H 'X-Workspace: test-exchange' \
  --insecure
```

# sample response curl for task status check:
```
{
    "items": [
        {
            "_id": "b5bf4409-fbf9-4d6a-8764-c266033d7bdd-0",
            "batchId": "b5bf4409-fbf9-4d6a-8764-c266033d7bdd",
            "pipelineId": "pipe:sys:define-offchain-schema-v1",
            "index": 0,
            "docNumber": "system-offchain-schema-v1",
            "status": "synced",
            "phase": "submit",
            "txnId": "0x693efaf71777d5b684f210fe37836e1575e84e62b63dfa5b48413c67b0f72ebe",
            "latency": {
                "initMs": 0,
                "collectMs": 0,
                "processMs": 0,
                "submitMs": 0,
                "syncMs": 0,
                "totalMs": 0
            },
            "createdAt": "0001-01-01T00:00:00Z",
            "updatedAt": "2026-03-05T11:44:40.341Z"
        }
    ],
    "total": 1,
    "offset": 0,
    "limit": 50
}
```


