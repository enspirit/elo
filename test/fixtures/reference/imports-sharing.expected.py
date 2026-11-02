






(lambda _: (_module_0 := {"name": "helper", "label": "shared-helper"}, _module_1 := (s := _module_0, {"a": s.get("name"), "label": s.get("label")})[-1], _module_2 := (s := _module_0, {"b": s.get("label"), "label": s.get("label")})[-1], a := _module_1, b := _module_2, name := _module_0.get("name"), label := _module_0.get("label"), kAssert(kEq(a.get("a"), "helper")))[-1])(None)
(lambda _: (_module_0 := {"name": "helper", "label": "shared-helper"}, _module_1 := (s := _module_0, {"a": s.get("name"), "label": s.get("label")})[-1], _module_2 := (s := _module_0, {"b": s.get("label"), "label": s.get("label")})[-1], a := _module_1, b := _module_2, name := _module_0.get("name"), label := _module_0.get("label"), kAssert(kEq(b.get("b"), "shared-helper")))[-1])(None)
(lambda _: (_module_0 := {"name": "helper", "label": "shared-helper"}, _module_1 := (s := _module_0, {"a": s.get("name"), "label": s.get("label")})[-1], _module_2 := (s := _module_0, {"b": s.get("label"), "label": s.get("label")})[-1], a := _module_1, b := _module_2, name := _module_0.get("name"), label := _module_0.get("label"), kAssert(kEq(name, "helper")))[-1])(None)
(lambda _: (_module_0 := {"name": "helper", "label": "shared-helper"}, _module_1 := (s := _module_0, {"a": s.get("name"), "label": s.get("label")})[-1], _module_2 := (s := _module_0, {"b": s.get("label"), "label": s.get("label")})[-1], a := _module_1, b := _module_2, name := _module_0.get("name"), label := _module_0.get("label"), kAssert(kEq(label, "shared-helper")))[-1])(None)

(lambda _: (_module_0 := {"name": "helper", "label": "shared-helper"}, _module_1 := (s := _module_0, {"a": s.get("name"), "label": s.get("label")})[-1], _module_2 := (s := _module_0, {"b": s.get("label"), "label": s.get("label")})[-1], a := _module_1, b := _module_2, name := _module_0.get("name"), label := _module_0.get("label"), kAssert(kEq(a.get("label"), label)))[-1])(None)
(lambda _: (_module_0 := {"name": "helper", "label": "shared-helper"}, _module_1 := (s := _module_0, {"a": s.get("name"), "label": s.get("label")})[-1], _module_2 := (s := _module_0, {"b": s.get("label"), "label": s.get("label")})[-1], a := _module_1, b := _module_2, name := _module_0.get("name"), label := _module_0.get("label"), kAssert(kEq(b.get("label"), label)))[-1])(None)
