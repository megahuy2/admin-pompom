"""
Convert Data_PomPom.xlsx (35 sheet) sang 1 file JSON sạch, dùng làm input cho
scripts/importExcelData.js. Chạy 1 lần duy nhất mỗi khi file Excel gốc thay đổi.

Cách dùng:
    python3 scripts/excel_to_json.py
Output:
    scripts/pompom_data.json
"""
import pandas as pd
import json
import sys
import os

EXCEL_PATH = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project/Data_PomPom.xlsx'
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'pompom_data.json')

# Các cột chứa giá trị ngày/giờ dạng Excel serial number (theo data dictionary gốc)
DATE_COLUMNS = {
    'join_date', 'last_login', 'birth_date', 'created_at', 'updated_at',
    'last_activity', 'used_at', 'assigned_at', 'start_date', 'end_date',
    'paid_at', 'searched_at', 'started_at', 'ended_at', 'viewed_at',
    'changed_at', 'created_at'
}

PHONE_COLUMNS = {'phone_number', 'phone'}

xls = pd.ExcelFile(EXCEL_PATH)
result = {}

for sheet_name in xls.sheet_names:
    # Tên sheet dạng "1. users" -> lấy phần sau số thứ tự
    clean_name = sheet_name.split('. ', 1)[1] if '. ' in sheet_name else sheet_name
    df = pd.read_excel(xls, sheet_name=sheet_name)

    # File gốc có một số cột bị lặp tên (lỗi export Excel) -> pandas tự đổi thành
    # 'col', 'col.1', 'col.2'... Chỉ giữ lại cột gốc (không hậu tố số).
    drop_cols = [c for c in df.columns if pd.Series([c]).str.match(r'.+\.\d+$').iloc[0]]
    if drop_cols:
        df = df.drop(columns=drop_cols)

    records = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                record[col] = None
                continue
            if col in PHONE_COLUMNS:
                # Số điện thoại VN bắt đầu bằng 0, Excel đọc thành float mất số 0 đầu -> phục hồi
                num_str = str(int(val)) if isinstance(val, float) else str(val)
                record[col] = '0' + num_str if not num_str.startswith('0') else num_str
                continue
            # Excel serial date -> ISO string (chỉ áp dụng cho cột biết là ngày tháng)
            if col in DATE_COLUMNS and isinstance(val, (int, float)):
                try:
                    ts = pd.Timestamp('1899-12-30') + pd.Timedelta(days=float(val))
                    record[col] = ts.isoformat()
                except Exception:
                    record[col] = str(val)
            elif pd.api.types.is_datetime64_any_dtype(type(val)) or isinstance(val, pd.Timestamp):
                record[col] = val.isoformat()
            elif isinstance(val, float) and val.is_integer():
                record[col] = int(val)
            elif hasattr(val, 'item'):
                record[col] = val.item()
            else:
                record[col] = val
        records.append(record)

    result[clean_name] = records
    print(f'{clean_name}: {len(records)} dòng')

def json_default(o):
    if isinstance(o, pd.Timestamp):
        return o.isoformat()
    if hasattr(o, 'item'):  # numpy int64/float64 -> python native
        return o.item()
    return str(o)

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2, default=json_default)

print(f'\nĐã lưu: {OUTPUT_PATH}')
