// Original pixel drawings. Each digit identifies one ink, and spaces let the water show through.
const baitedHook = {
  palette: ["#62331f", "#985127", "#c9792e", "#f5ad46", "#ffdb8d", "#fff2c8", "#e08741"],
  rows: [
    "              333",
    "             35 43",
    "             35  4",
    "             24 43",
    "              343",
    "               34",
    "               34",
    "               34",
    "               34",
    "               34  233",
    "               34 34453",
    "               34  27543",
    "     4         34    773",
    "    34         35    743",
    "    343        35   7752",
    "    3443       34447743",
    "    34 33     25777732",
    "    234      34733",
    "     344    34734",
    "      34433447534",
    "       234444353",
    "         23322374",
    "                743",
    "                743",
    "              2773",
    "             3772",
    "             332"
  ]
};

const schooler = {
  palette: ["#11516e", "#14799d", "#109dbb", "#24bfd4", "#66e1ed", "#b4f7f5", "#102e50"],
  rows: [
    "              22",
    "            23342",
    "          2344552",
    "         23344432",
    "       23344555323",
    "     234555554444432        2",
    "   234556655444444432     234",
    "  23455445544334444432   2344",
    " 2346774555433344444432234442",
    " 244777445544334443333344432",
    "345457745554333443322343332",
    "23455555555334333223223322",
    " 23444555543444332222 22332",
    "   2334444334443222     2332",
    "     223333433222        2342",
    "       222334432          223",
    "           23432",
    "             232"
  ]
};

const squid = {
  palette: ["#651637", "#a62242", "#df284c", "#fa4359", "#ff7882", "#ffd4bf", "#3f2246"],
  rows: [
    "     3        4        3",
    "      4      4        3",
    "      43     4    4   3",
    "       4      4   4  4",
    "  3    43     43  4  4",
    "   4    4      4  4   3",
    "   4     4    43   4  4",
    "    4    43   4    4 43",
    "     43   4  43   4  4",
    "      34  43 4   4  4",
    "        4 3443  4  4",
    "         43444443 3",
    "          34444433",
    "         234555432",
    "         245555443",
    "        2356744662",
    "        2357744772",
    "         33444442",
    "          345443",
    "         23454432",
    "        3345544323",
    "       333455443333",
    "      23324544432232",
    "      22 23444432 22",
    "         23444332",
    "          234432",
    "           2342",
    "            22"
  ]
};

const angler = {
  palette: ["#252c49", "#39425e", "#515976", "#7883a3", "#a0acc2", "#e9f6ff", "#151c31", "#b7b5ff"],
  rows: [
    "         33443",
    "       343    32",
    "      43       32",
    "     44         3      3",
    "    8868        32    32",
    "    8668        322  332",
    "     88      22333322232",
    "           2344443332332       2",
    "         2344333343333332     32",
    "        234333333433333332   332",
    "       2343356733443323333223332",
    "      23443367743333322333322332",
    "     234322333333322222223222232",
    "     24211112333322233222322222",
    "    24265777123322233322232 222",
    "    22 56767723322222332232  232",
    "    2  6    72332221122322    32",
    "    2      67233222112222",
    "     3 6  67233221122332",
    "      34566333222222332",
    "       233333222212332",
    "         22222111 222",
    "            22"
  ]
};

const krill = {
  palette: ["#882a50", "#ad355a", "#d94368", "#fa6582", "#ff9ba6", "#ffdfca", "#3a2740"],
  rows: [
    "             333333",
    "          334      3",
    "        34",
    "       43        34444",
    "      43      344     3",
    "       4    34       2333",
    "        4  43   23344555432",
    "   33   343  234456655444332",
    "     343334344555555443455432",
    "       34556655444443345655432",
    "    33445567754444332234554432",
    "       334477444332231234443332",
    "        2334443322 34  233344432",
    "      33 2233332  34   234455432",
    "    33   32 32  34    2344554432",
    "        32 32  32   3  23344432",
    "       3   3  3    3   23444432",
    "            3    33   23455432",
    "     34             234554432",
    "     3453  34     2345544332",
    "      34543443  233444332",
    "      23445444334433332",
    "       2334354444332",
    "      344432333322",
    "      232"
  ]
};

function bubbleCluster() {
  const palette = ["#5a8fba4f", "#73a2bb66", "#9ac8d9a8", "#bfebeeda", "#dcf8ff", "#f5feff"];
  const grid = Array.from({ length: 25 }, () => Array(31).fill(" "));
  for (const [cx, cy, radius] of [[7.5, 18.5, 4], [17, 10, 8.4], [25.5, 18.5, 4.8]]) {
    grid.forEach((row, y) => row.forEach((_, x) => {
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const distance = Math.hypot(dx, dy);
      if (distance > 1) return;
      let ink = distance > 1 - 0.95 / radius ? 3 : 1;
      if (distance > 0.8 && dx + dy < -0.25) ink = 4;
      const light = dx + dy + 0.13 * ((x + 2 * y) % 3 - 1);
      if (distance < 0.8 && light < -0.32) ink = 2;
      if (distance > 0.73 && distance < 0.86 && dx - dy > 0.85) ink = 2;
      if ((dx + 0.36) ** 2 + (dy + 0.51) ** 2 < 0.034) ink = 5;
      if ((dx + 0.18) ** 2 + (dy + 0.67) ** 2 < 0.009) ink = 6;
      if (dy > 0.4 && dx + dy > 1.17) ink = 4;
      row[x] = String(ink);
    }));
  }
  return { palette, rows: grid.map(row => row.join("")) };
}

function sprite({ palette, rows }, sparkles = false) {
  const width = Math.max(...rows.map(row => row.length));
  const left = Math.floor((34 - width) / 2);
  const top = Math.floor((30 - rows.length) / 2);
  const paths = palette.map(() => "");
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const first = x;
      const ink = row[x++];
      while (row[x] === ink) x++;
      if (ink === " ") continue;
      const run = x - first;
      paths[Number(ink) - 1] += `M${left + first} ${top + y}h${run}v1h-${run}z`;
    }
  });
  const drawing = paths.map((path, i) => path ? `<path fill="${palette[i]}" d="${path}"/>` : "").join("");
  const glints = sparkles ? '<path fill="#ffcf62" d="M28 0h1v2h2v1h-2v2h-1V3h-2V2h2zM2 21h1v1h1v1H3v1H2v-1H1v-1h1z"/>' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 30" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${drawing}${glints}</svg>`;
}

const marks = [bubbleCluster(), baitedHook, schooler, squid, angler].map(art => sprite(art));
marks.push(sprite(krill, true), sprite(krill));

export function specimen(index) {
  return marks[index] || "";
}
