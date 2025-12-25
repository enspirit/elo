(function() { if (!(person.age == 25)) throw new Error("Assertion failed"); return true; })()
(function() { if (!(employee.salary > 50000)) throw new Error("Assertion failed"); return true; })()
(function() { function kAdd(l, r) { if (dayjs.isDayjs(l) && dayjs.isDuration(r)) return l.add(r); if (dayjs.isDuration(l) && dayjs.isDayjs(r)) return r.add(l); if (dayjs.isDuration(l) && dayjs.isDuration(r)) return dayjs.duration(l.asMilliseconds() + r.asMilliseconds()); return l + r; } return (function() { if (!(kAdd(customer.balance, 100) == 600)) throw new Error("Assertion failed"); return true; })(); })()
(function() { if (!(student.gpa >= 3 && student.enrolled)) throw new Error("Assertion failed"); return true; })()
