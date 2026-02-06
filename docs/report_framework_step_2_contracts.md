# STEP 2 – CONTRACTS & CONFIG DESIGN

## 1. Mục tiêu

-   Chuẩn hoá hợp đồng giữa SQL – Engine – Excel – Mail
-   Không cố định số sheet trong Excel
-   Summary được mô hình hoá thành **Render Blocks**
-   Mở rộng report bằng cấu hình, không sửa code

---

## 2. Tư duy cốt lõi

-   Excel **không phải** source of truth
-   Source of truth là:
    -   SQL output
    -   Report config
-   Summary = tập hợp các block có thể render độc lập

---

## 3. Report Config – Tổng thể (ví dụ)

```json
{
    "report_id": "daily_production",
    "schedule": "0 8 * * *",
    "timezone": "Asia/Ho_Chi_Minh",

    "data_scope": {
        "lookback_days": 90,
        "static_days": [7, 14],
        "cleanup_policy": "keep_3_months"
    },

    "sql": {
        "stored_procedure": "sp_report_daily",
        "params": {
            "from_date": "{{date-90}}",
            "to_date": "{{date}}"
        }
    },

    "excel": {
        "template": "daily_report.xlsx",
        "rawdata_sheet": "RAW"
    },

    "render_blocks": [
        {
            "id": "kpi_table",
            "sheet": "SUMMARY",
            "range": "A1:F10",
            "type": "table",
            "render": "html",
            "order": 1
        },
        {
            "id": "trend_chart",
            "sheet": "SUMMARY",
            "range": "H1:O20",
            "type": "chart",
            "render": "image",
            "order": 2
        }
    ],

    "mail": {
        "to": ["team@company.com"],
        "subject": "Daily Production Report",
        "attach_excel": true
    }
}
```

---

## 4. SQL Contract

-   SQL xử lý 70–80% logic
-   Trả về dataset đã tính toán xong
-   Không phụ thuộc sheet Excel

---

## 5. Render Block Contract

| Thuộc tính | Ý nghĩa                |
| ---------- | ---------------------- |
| id         | Định danh block        |
| sheet      | Sheet nguồn (optional) |
| range      | Vùng dữ liệu / chart   |
| type       | table / chart / mixed  |
| render     | html / image           |
| order      | Thứ tự render          |

---

## 6. Excel Template Rules

-   Không giới hạn số sheet
-   Sheet chỉ dùng để trình bày
-   Format / chart nằm ở Excel

    1.Nếu thắc mắc Về thư viện

Rules:

-   Adapter must NOT depend on Excel library capabilities.
-   Adapter responsibility is abstract, not Excel-feature driven.

Decision:

-   Use exceljs for .xlsx only.
-   .xlsb is NOT a requirement for the core engine.
-   If template is .xlsb, adapter will treat it as opaque (no parsing of charts).

Rationale:

-   Charts/format are preserved by using template copying, not by rebuilding.

    2.Nếu bắn khoăn Adapter cần làm gì cụ thể:
    Rules:

-   Adapter does ONE thing only.
-   No adapter handles both data and rendering.

Responsibilities:

-   ExcelAdapter:

    -   Load template (if any)
    -   Write rawdata / datasets into specified ranges
    -   Save output file
    -   DOES NOT render mail content
    -   DOES NOT decide what is summary

-   SnapshotAdapter (separate):

    -   Capture image from given sheet + range
    -   Used ONLY by Render Block Engine when render_mode=image

    3.Nếu băn khoăng về đường dẫn File:
    Rules:

-   File paths come from report config, not hardcoded.
-   Template is OPTIONAL.

Details:

-   Template path is defined in report config.
-   Engine must work even when no template exists.
-   Adapter must not assume fixed sheet names or counts.

---

## 7. Kết luận

> STEP 2 định nghĩa **luật chơi chung**, cho phép report đa dạng mà engine không đổi.
