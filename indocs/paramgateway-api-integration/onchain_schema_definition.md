# sample request curl for onchain schema definition:
```
postman request POST 'http://speedtest.param.network:8450/api/pipelines/pipe%3Asys%3Adefine-schema-v1/execute?dryRun=false' \
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
    "defId": "public:0x07724ce1e8bf3c01ae5a5cd6f1a29d65752940e6cfab59619087fe7276a4b74a",
    "displayName": "Inbound Shipment",
    "desc": "Field schema for Inbound Shipment",
    "version": "1.0",
    "properties": {
      "DocDetails": {
        "type": "object",
        "required": false,
        "properties": {
          "D_Type": {
            "type": "string",
            "required": false,
            "hidden": true
          },
          "D_OrderStatus": {
            "type": "string",
            "required": false,
            "desc": "Status",
            "order": 70
          },
          "D_MinimumPaymentDueMinPrice": {
            "type": "number",
            "required": false,
            "hidden": true
          },
          "D_MinimumPaymentDuePriceCurrency": {
            "type": "string",
            "required": false,
            "pattern": "^[a-zA-Z]{3}$",
            "hidden": true
          },
          "D_PaymentMethod": {
            "type": "string",
            "required": false,
            "hidden": true
          },
          "D_TotalPaymentDueMinPrice": {
            "type": "number",
            "required": false,
            "desc": "Amount",
            "order": 500
          },
          "D_TotalPaymentDuePriceCurrency": {
            "type": "string",
            "required": false,
            "pattern": "^[a-zA-Z]{3}$",
            "order": 0,
            "desc": "Currency"
          },
          "D_OffersAddOn": {
            "type": "array",
            "required": false,
            "desc": "Offer Add On",
            "order": 0,
            "items": [
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Total",
                    "hidden": true
                  },
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "enum": [
                      "%",
                      "value"
                    ],
                    "defaultValue": "value",
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "I_Total",
                    "hidden": true
                  },
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Total",
                    "hidden": true
                  }
                }
              },
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "value",
                    "enum": [
                      "%",
                      "value"
                    ],
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "Total-Discount",
                    "hidden": true
                  },
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "SubTotal",
                    "hidden": true
                  },
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Sub Total",
                    "hidden": true
                  }
                }
              },
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "TaxAmount",
                    "hidden": true
                  },
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Tax Amount",
                    "hidden": true
                  },
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "value",
                    "enum": [
                      "%",
                      "value"
                    ],
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "CGST+SGST+IGST",
                    "hidden": true
                  }
                }
              },
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Grand Total",
                    "hidden": true
                  },
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "enum": [
                      "%",
                      "value"
                    ],
                    "defaultValue": "%",
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "SubTotal+TaxAmount",
                    "hidden": true
                  },
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "GrandTotal",
                    "hidden": true
                  }
                }
              }
            ]
          },
          "D_ScheduledPaymentDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_OrderedDate": {
            "type": "date",
            "required": false,
            "desc": "Booking Date",
            "order": 100
          },
          "D_PaymentDueDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_ExpiryDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_PaymentTerms": {
            "type": "string",
            "required": false,
            "enum": [
              "60",
              "90"
            ],
            "desc": "Payment Terms (Days)",
            "order": 210
          },
          "D_ItemCount": {
            "type": "integer",
            "required": false,
            "hidden": true
          },
          "D_ExpectedDeliveryDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_OrderNumber": {
            "type": "string",
            "required": false,
            "link": "_id",
            "order": 101,
            "desc": "EXIM ID"
          },
          "D_DeliveryAddress": {
            "type": "string",
            "required": false,
            "order": 0,
            "desc": "Delivery Location"
          },
          "D_Identifier": {
            "type": "string",
            "required": false,
            "hidden": true
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
            "31838ac9-0a46-445b-8f8a-680e7d201d17"
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
    "_id": "public:0x07724ce1e8bf3c01ae5a5cd6f1a29d65752940e6cfab59619087fe7276a4b74a",
    "defId": "public:0x07724ce1e8bf3c01ae5a5cd6f1a29d65752940e6cfab59619087fe7276a4b74a",
    "displayName": "Inbound Shipment",
    "desc": "Field schema for Inbound Shipment",
    "version": "1.0",
    "properties": {
      "DocDetails": {
        "type": "object",
        "required": false,
        "properties": {
          "D_Type": {
            "type": "string",
            "required": false,
            "hidden": true
          },
          "D_OrderStatus": {
            "type": "string",
            "required": false,
            "desc": "Status",
            "order": 70
          },
          "D_MinimumPaymentDueMinPrice": {
            "type": "number",
            "required": false,
            "hidden": true
          },
          "D_MinimumPaymentDuePriceCurrency": {
            "type": "string",
            "required": false,
            "pattern": "^[a-zA-Z]{3}$",
            "hidden": true
          },
          "D_PaymentMethod": {
            "type": "string",
            "required": false,
            "hidden": true
          },
          "D_TotalPaymentDueMinPrice": {
            "type": "number",
            "required": false,
            "desc": "Amount",
            "order": 500
          },
          "D_TotalPaymentDuePriceCurrency": {
            "type": "string",
            "required": false,
            "pattern": "^[a-zA-Z]{3}$",
            "order": 0,
            "desc": "Currency"
          },
          "D_OffersAddOn": {
            "type": "array",
            "required": false,
            "desc": "Offer Add On",
            "order": 0,
            "items": [
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Total",
                    "hidden": true
                  },
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "enum": [
                      "%",
                      "value"
                    ],
                    "defaultValue": "value",
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "I_Total",
                    "hidden": true
                  },
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Total",
                    "hidden": true
                  }
                }
              },
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "value",
                    "enum": [
                      "%",
                      "value"
                    ],
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "Total-Discount",
                    "hidden": true
                  },
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "SubTotal",
                    "hidden": true
                  },
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Sub Total",
                    "hidden": true
                  }
                }
              },
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "TaxAmount",
                    "hidden": true
                  },
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Tax Amount",
                    "hidden": true
                  },
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "value",
                    "enum": [
                      "%",
                      "value"
                    ],
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "CGST+SGST+IGST",
                    "hidden": true
                  }
                }
              },
              {
                "type": "object",
                "required": false,
                "indexes": [
                  "D_Type",
                  "D_Price",
                  "D_Name"
                ],
                "order": [
                  "D_Name",
                  "D_Price",
                  "D_Type"
                ],
                "properties": {
                  "D_Title": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "Grand Total",
                    "hidden": true
                  },
                  "D_Type": {
                    "type": "string",
                    "required": false,
                    "enum": [
                      "%",
                      "value"
                    ],
                    "defaultValue": "%",
                    "hidden": true
                  },
                  "D_Price": {
                    "type": "number",
                    "required": false,
                    "formula": "SubTotal+TaxAmount",
                    "hidden": true
                  },
                  "D_Name": {
                    "type": "string",
                    "required": false,
                    "defaultValue": "GrandTotal",
                    "hidden": true
                  }
                }
              }
            ]
          },
          "D_ScheduledPaymentDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_OrderedDate": {
            "type": "date",
            "required": false,
            "desc": "Booking Date",
            "order": 100
          },
          "D_PaymentDueDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_ExpiryDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_PaymentTerms": {
            "type": "string",
            "required": false,
            "enum": [
              "60",
              "90"
            ],
            "desc": "Payment Terms (Days)",
            "order": 210
          },
          "D_ItemCount": {
            "type": "integer",
            "required": false,
            "hidden": true
          },
          "D_ExpectedDeliveryDate": {
            "type": "date",
            "required": false,
            "hidden": true
          },
          "D_OrderNumber": {
            "type": "string",
            "required": false,
            "link": "_id",
            "order": 101,
            "desc": "EXIM ID"
          },
          "D_DeliveryAddress": {
            "type": "string",
            "required": false,
            "order": 0,
            "desc": "Delivery Location"
          },
          "D_Identifier": {
            "type": "string",
            "required": false,
            "hidden": true
          }
        }
      }
    }
  }
```