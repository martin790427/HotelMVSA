function calc() {
  const date = document.getElementById("d").value;

  // 例：春節日期表
  const spring = ["2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20"];

  let price = 0;

  if (spring.includes(date)) {
    price = 6000; // 春節價
  } else {
    price = 3200; // 平日價
  }

  document.getElementById("out").innerHTML = "報價：" + price + " 元";
}
