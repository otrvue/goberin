{
    "success": false,
    "status": "DUPLICATE_REFERENCE_ID",
    "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
    "inquiryId": "TRX-123",
    "message": "referenceId sudah digunakan, mengembalikan data transaksi yang sudah ada",
    "data": {
        "customerName": "B*H*X*",
        "billAmount": 78844,
        "adminFee": 2500,
        "totalAmount": 81344,
        "detail": {
            "tarif": "-",
            "lembar_tagihan": 1,
            "alamat": "-",
            "detail": [
                {
                    "periode": "062026",
                    "nilai_tagihan": "77180.0",
                    "admin": "2500",
                    "denda": "0.0",
                    "meter_awal": "0",
                    "meter_akhir": "0",
                    "biaya_lain": "0"
                }
            ],
            "providerStatus": "Sukses",
            "providerInquiryId": "TRX-123",
            "providerTransactionId": "TRX-123",
            "providerRefId": "TRX-123",
            "providerTotal": 81344,
            "markupType": null,
            "markupValue": 0,
            "markupAmount": 0
        }
    },
    "error": {
        "code": "REFERENCE_ID_NOT_UNIQUE",
        "message": "referenceId sudah digunakan"
    }
}



{
    "success": true,
    "status": "DUPLICATE_REFERENCE_ID",
    "transactionId": "bcbd9e97-90c2-44e0-9f7c-86b8657378ac",
    "inquiryId": "TRX-123",
    "message": "referenceId sudah digunakan, mengembalikan data transaksi yang sudah ada",
    "data": {
        "billStatus": "<STATUS TAGIHAN>",
        "customerName": "B*H*X*",
        "billAmount": 78844,
        "adminFee": 2500,
        "totalAmount": 81344,
        "tarif": "-",
        "lembar_tagihan": 1,
        "alamat": "-",
        "detail": [
                {
                    "periode": "062026",
                    "nilai_tagihan": "77180.0",
                    "admin": "2500",
                    "denda": "0.0",
                    "meter_awal": "0",
                    "meter_akhir": "0",
                    "biaya_lain": "0"
                }
            ],
        "notes": "<notes>",
    },

    "error": // muncul ketika benar benar error dari provider jangan tampilkan jika duplikat
}