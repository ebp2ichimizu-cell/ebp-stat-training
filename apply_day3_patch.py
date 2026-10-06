#!/usr/bin/env python3
import json
from pathlib import Path
p=Path("data/days/day3.json")
o=json.loads(p.read_text(encoding="utf-8"))
q=next(x for x in o["questions"] if x["id"]=="D03-K03-Q2")
q["question"]="状況説明／データ 特殊詐欺被害リスクの簡易チェックを1,000人に実施しました。50人が『高リスク』と判定され、その後1か月に実際の被害が確認された人は全体で10人でした。被害者10人のうち8人は高リスク群、2人はそれ以外でした。 この結果の実務上の解釈として、最も適切なものはどれですか。"
p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("updated",p)
