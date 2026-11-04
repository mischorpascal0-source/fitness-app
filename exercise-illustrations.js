const exerciseIllustrations = (() => {
  const namespace = "http://www.w3.org/2000/svg";
  const offset = ([x, y], dx, dy) => [x + dx, y + dy];
  const standingLegs = [[[106, 132], [105, 155]], [[134, 132], [135, 155]]];
  const seatedLegs = [[[104, 126], [101, 151]], [[136, 126], [139, 151]]];

  function front(arms, legs = standingLegs, y = 0, tilt = 0) {
    return {
      head: [120 + tilt, 41 + y], shoulders: [[105 + tilt, 60 + y], [135 + tilt, 60 + y]],
      hips: [[112, 105 + y], [128, 105 + y]], arms, legs, front: true,
    };
  }

  function side(head, shoulder, hip, arm, leg, secondLeg, supportArm) {
    return {
      head, shoulders: [offset(shoulder, -4, -2), shoulder], hips: [offset(hip, -4, -2), hip],
      arms: [supportArm ?? arm.map((point) => offset(point, -5, -4)), arm],
      legs: [secondLeg ?? leg.map((point) => offset(point, -8, -2)), leg],
    };
  }

  const seated = (arm, leg = [[148, 119], [154, 153]]) => side([108, 55], [109, 73], [111, 115], arm, leg);
  const standingSide = (arm) => side([114, 40], [113, 59], [111, 104], arm, [[119, 130], [119, 155]], [[103, 129], [101, 155]]);
  const bench = (arm) => side([69, 101], [91, 106], [143, 110], arm, [[168, 117], [170, 154]]);
  const incline = (arm) => side([79, 61], [90, 79], [126, 111], arm, [[152, 119], [156, 154]]);
  const decline = (arm) => side([72, 115], [94, 113], [142, 100], arm, [[167, 96], [173, 116]]);
  const lunge = (arm) => side([113, 51], [112, 69], [111, 111], arm, [[144, 112], [147, 154]], [[83, 145], [65, 151]]);
  const barArms = [[[92, 84], [94, 62]], [[148, 84], [146, 62]]];
  const squatLegs = [[[88, 127], [86, 155]], [[152, 127], [154, 155]]];
  const lowArms = [[[101, 90], [98, 119]], [[139, 90], [142, 119]]];
  const openArms = [[[83, 62], [62, 66]], [[157, 62], [178, 66]]];

  const poses = {
    benchPress: bench([[101, 76], [102, 48]]),
    inclinePress: incline([[104, 58], [110, 33]]),
    declinePress: decline([[108, 86], [108, 58]]),
    floorPress: side([68, 139], [89, 143], [139, 148], [[97, 116], [97, 91]], [[164, 120], [181, 155]]),
    benchFly: bench([[83, 80], [65, 64]]),
    inclineFly: incline([[113, 75], [137, 61]]),
    chestPress: seated([[135, 78], [166, 79]]),
    chestPressUp: seated([[135, 68], [160, 50]]),
    chestPressDown: seated([[135, 86], [162, 100]]),
    seatedFly: front([[[89, 67], [94, 80]], [[151, 67], [146, 80]]], seatedLegs, 8),
    standingPress: front([[[92, 76], [109, 72]], [[148, 76], [131, 72]]]),
    fly: front([[[83, 69], [101, 77]], [[157, 69], [139, 77]]]),
    flyDown: front([[[88, 80], [106, 100]], [[152, 80], [134, 100]]]),
    flyUp: front([[[89, 83], [107, 58]], [[151, 83], [133, 58]]]),
    supportedRow: side([79, 70], [91, 83], [133, 100], [[119, 74], [115, 100]], [[141, 115], [153, 116]],
      [[155, 129], [161, 154]], [[86, 99], [82, 114]]),
    bentRow: side([77, 73], [95, 85], [138, 105], [[117, 77], [115, 104]], [[131, 128], [143, 154]]),
    inclineRow: side([75, 63], [91, 78], [124, 106], [[110, 78], [111, 106]], [[145, 123], [152, 154]]),
    pullover: bench([[70, 83], [45, 77]]),
    standing: front(lowArms),
    latWide: front([[[87, 76], [79, 51]], [[153, 76], [161, 51]]], seatedLegs, 13),
    latClose: front([[[94, 76], [112, 52]], [[146, 76], [128, 52]]], seatedLegs, 13),
    latUnder: front([[[97, 79], [101, 51]], [[143, 79], [139, 51]]], seatedLegs, 13),
    seatedRow: seated([[104, 92], [139, 91]], [[146, 125], [178, 145]]),
    highRow: seated([[115, 84], [149, 65]], [[145, 125], [163, 150]]),
    lowRow: seated([[106, 97], [143, 105]], [[145, 126], [172, 148]]),
    seatedWideRow: seated([[117, 77], [154, 84]], [[149, 127], [179, 144]]),
    assistedPull: front([[[86, 60], [85, 29]], [[154, 60], [155, 29]]], [[[108, 115], [99, 113]], [[132, 115], [142, 113]]], -10),
    assistedDip: front([[[87, 81], [87, 96]], [[153, 81], [153, 96]]], [[[109, 130], [98, 128]], [[131, 130], [142, 128]]]),
    machinePullover: seated([[150, 77], [152, 91]]),
    seatedLean: side([87, 58], [95, 76], [115, 115], [[121, 94], [106, 84]], [[149, 120], [153, 153]]),
    singleRow: standingSide([[102, 78], [141, 80]]),
    kneelingPulldown: side([107, 66], [108, 85], [109, 124], [[119, 85], [134, 58]], [[109, 151], [78, 154]]),
    straightPulldown: side([120, 50], [118, 66], [103, 105], [[133, 88], [136, 111]], [[107, 130], [109, 155]]),
    overheadPress: front([[[85, 60], [87, 30]], [[155, 60], [153, 30]]], seatedLegs, 16),
    standingOverhead: front([[[90, 36], [91, 17]], [[150, 36], [149, 17]]]),
    arnold: front([[[100, 79], [109, 55]], [[140, 79], [131, 55]]], seatedLegs, 16),
    lateral: front(openArms),
    seatedLateral: front([[[82, 78], [73, 75]], [[158, 78], [167, 75]]], seatedLegs, 13),
    frontRaise: standingSide([[141, 61], [168, 60]]),
    reverseFly: side([76, 72], [93, 83], [140, 104], [[107, 65], [131, 55]], [[131, 131], [143, 155]]),
    reverseFlyFront: front(openArms),
    seatedReverseFly: front([[[82, 74], [67, 79]], [[158, 74], [173, 79]]], seatedLegs, 10),
    singleLateral: front([[[93, 84], [95, 112]], [[157, 62], [177, 65]]]),
    facePull: standingSide([[137, 71], [126, 50]]),
    curl: front([[[102, 86], [101, 61]], [[138, 86], [139, 61]]]),
    inclineCurl: incline([[93, 102], [111, 87]]),
    concentrationCurl: seated([[137, 118], [131, 94]]),
    preacherCurl: seated([[142, 99], [152, 77]]),
    preacherExtension: seated([[138, 99], [168, 110]]),
    crossCurl: front([[[99, 89], [126, 71]], [[139, 90], [142, 115]]]),
    zottman: front([[[102, 86], [101, 62]], [[139, 90], [144, 106]]]),
    wristCurl: seated([[135, 114], [158, 105]]),
    wristExtension: seated([[137, 116], [160, 113]]),
    cableCurl: standingSide([[114, 86], [142, 69]]),
    bayesianCurl: standingSide([[97, 83], [119, 73]]),
    overheadExtension: seated([[120, 44], [105, 23]]),
    standingExtension: standingSide([[132, 42], [152, 27]]),
    lyingExtension: bench([[99, 74], [73, 68]]),
    kickback: side([78, 71], [94, 83], [134, 100], [[122, 79], [149, 81]], [[141, 115], [153, 116]],
      [[155, 129], [161, 154]], [[87, 99], [83, 114]]),
    standingKickback: side([119, 53], [115, 70], [94, 107], [[92, 74], [68, 82]], [[102, 131], [107, 154]]),
    closeBenchPress: bench([[98, 79], [101, 54]]),
    seatedDip: seated([[105, 94], [117, 119]]),
    pushdown: standingSide([[120, 85], [139, 106]]),
    singlePushdown: front([[[96, 86], [93, 106]], [[137, 88], [140, 114]]]),
    goblet: front([[[101, 88], [116, 72]], [[139, 88], [124, 72]]], squatLegs, 12),
    squat: front([[[96, 89], [93, 115]], [[144, 89], [147, 115]]], squatLegs, 12),
    sumo: front([[[106, 96], [116, 114]], [[134, 96], [124, 114]]], [[[80, 127], [76, 155]], [[160, 127], [164, 155]]], 13),
    lunge: lunge([[113, 93], [116, 117]]),
    bodyLunge: lunge([[128, 87], [133, 103]]),
    barLunge: lunge([[135, 81], [120, 69]]),
    sideLunge: front([[[104, 84], [121, 74]], [[141, 84], [126, 74]]], [[[85, 123], [78, 155]], [[151, 129], [177, 155]]], 12, 11),
    splitSquat: side([122, 49], [120, 68], [116, 108], [[122, 91], [123, 116]], [[144, 112], [149, 153]], [[89, 130], [62, 123]]),
    stepUp: side([108, 40], [108, 59], [110, 100], [[108, 85], [110, 108]], [[133, 107], [143, 122]], [[94, 126], [82, 155]]),
    hinge: side([91, 66], [103, 81], [141, 106], [[111, 106], [118, 131]], [[138, 130], [142, 155]]),
    singleHinge: side([73, 72], [92, 84], [128, 92], [[94, 109], [99, 134]], [[126, 124], [131, 155]], [[157, 93], [182, 98]]),
    hipThrust: side([76, 105], [93, 115], [137, 118], [[117, 112], [138, 112]], [[161, 121], [163, 154]]),
    bridge: side([69, 143], [89, 147], [132, 122], [[111, 139], [132, 126]], [[155, 115], [176, 155]]),
    legPress: side([77, 98], [88, 113], [116, 137], [[106, 123], [126, 128]], [[140, 107], [164, 84]]),
    horizontalPress: seated([[123, 94], [125, 117]], [[152, 108], [183, 114]]),
    singleLegPress: side([77, 98], [88, 113], [116, 137], [[107, 125], [128, 131]], [[142, 108], [164, 84]], [[134, 140], [142, 155]]),
    hackSquat: side([124, 61], [116, 80], [103, 113], [[119, 98], [136, 83]], [[130, 124], [145, 151]]),
    pendulumSquat: side([113, 61], [107, 78], [102, 117], [[117, 96], [132, 83]], [[137, 127], [146, 153]]),
    beltSquat: front([[[92, 81], [78, 96]], [[148, 81], [162, 96]]], squatLegs, 12),
    legExtension: seated([[123, 94], [130, 113]], [[148, 119], [181, 108]]),
    seatedLegCurl: seated([[123, 91], [134, 108]], [[150, 118], [139, 149]]),
    lyingLegCurl: side([177, 104], [153, 111], [111, 112], [[162, 122], [178, 123]], [[82, 112], [72, 81]]),
    standingLegCurl: side([116, 42], [113, 60], [108, 102], [[131, 76], [150, 77]], [[108, 128], [79, 108]], [[104, 130], [104, 155]]),
    abduction: front([[[93, 96], [91, 119]], [[147, 96], [149, 119]]], [[[89, 128], [82, 152]], [[151, 128], [158, 152]]], 11),
    adduction: front([[[95, 94], [94, 116]], [[145, 94], [146, 116]]], [[[112, 124], [108, 153]], [[128, 124], [132, 153]]], 11),
    legKickback: side([128, 51], [121, 69], [105, 106], [[139, 89], [157, 83]], [[82, 116], [59, 112]], [[110, 130], [112, 155]]),
    pullThrough: side([120, 59], [115, 74], [96, 109], [[122, 95], [110, 118]], [[106, 130], [109, 155]]),
    standingAbduction: front([[[96, 82], [79, 86]], [[141, 89], [142, 113]]], [[[108, 132], [106, 155]], [[149, 126], [171, 143]]]),
    standingAdduction: front([[[96, 83], [79, 90]], [[142, 92], [146, 113]]], [[[110, 132], [112, 155]], [[120, 132], [91, 151]]]),
    barSquat: front(barArms, squatLegs, 12),
    frontSquat: front([[[94, 70], [109, 61]], [[146, 70], [131, 61]]], squatLegs, 12),
    bodySquat: front([[[100, 75], [112, 72]], [[140, 75], [128, 72]]], squatLegs, 12),
    calfRaise: { ...side([112, 34], [112, 52], [111, 96], [[109, 78], [108, 103]], [[114, 122], [113, 147]]), heelRaised: true },
    singleCalf: { ...side([112, 35], [112, 53], [110, 98], [[108, 78], [106, 105]], [[111, 121], [110, 147]],
      [[96, 121], [91, 104]], [[87, 72], [69, 80]]), heelRaised: true },
    seatedCalf: seated([[128, 96], [143, 111]], [[149, 116], [150, 144]]),
    calfPress: side([78, 100], [91, 114], [117, 136], [[108, 124], [124, 132]], [[142, 107], [164, 84]]),
    barCalf: front(barArms, [[[108, 120], [106, 142]], [[132, 120], [134, 142]]], -8),
    crunch: side([75, 112], [89, 125], [127, 147], [[102, 123], [95, 113]], [[151, 121], [170, 155]]),
    sideBend: front(lowArms, standingLegs, 0, -16),
    carry: side([113, 39], [112, 57], [111, 101], [[122, 79], [127, 103]], [[130, 125], [143, 153]], [[90, 130], [76, 151]]),
    machineCrunch: side([128, 72], [120, 85], [106, 120], [[138, 91], [147, 83]], [[140, 122], [141, 152]]),
    rotation: front([[[95, 76], [116, 70]], [[144, 73], [133, 69]]], seatedLegs, 14, 8),
    kneelingCrunch: side([137, 107], [119, 99], [102, 123], [[143, 120], [138, 101]], [[108, 151], [77, 154]]),
    pallof: standingSide([[139, 67], [169, 67]]),
    chopDown: front([[[108, 82], [134, 104]], [[154, 88], [144, 105]]], standingLegs, 0, 5),
    chopUp: front([[[105, 61], [131, 39]], [[149, 51], [140, 35]]], standingLegs, 0, 5),
    pushUp: side([164, 100], [145, 106], [104, 118], [[146, 129], [147, 156]], [[80, 132], [56, 153]]),
    inclinePushUp: side([164, 79], [146, 86], [106, 111], [[151, 102], [156, 126]], [[81, 133], [59, 154]]),
    closePushUp: side([164, 108], [146, 111], [104, 123], [[127, 130], [145, 156]], [[81, 137], [58, 154]]),
    pullUp: front([[[88, 59], [86, 28]], [[152, 59], [154, 28]]], [[[110, 111], [103, 134]], [[130, 111], [135, 134]]], -9),
    invertedRow: side([150, 77], [133, 90], [96, 117], [[149, 70], [137, 52]], [[77, 135], [57, 153]]),
    pike: side([153, 120], [137, 108], [104, 75], [[154, 133], [145, 155]], [[90, 110], [68, 155]]),
    deadBug: side([67, 145], [88, 147], [130, 147], [[81, 125], [66, 105]], [[148, 116], [175, 117]], [[154, 138], [179, 133]]),
  };

  const line = (name, ...points) => `<polyline class="${name}" points="${points.join(" ")}"/>`;
  const rect = (name, x, y, width, height, radius = 3) =>
    `<rect class="${name}" x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/>`;
  const circle = (name, [x, y], radius) => `<circle class="${name}" cx="${x}" cy="${y}" r="${radius}"/>`;
  const frame = (...points) => line("illustration-frame", ...points);
  const pad = (...points) => line("illustration-pad", ...points);
  const lever = (...points) => line("illustration-lever", ...points);
  const cable = (...points) => line("illustration-cable", ...points);
  const pivot = (point) => circle("illustration-pivot", point, 4);
  const seat = (x = 109, y = 119) =>
    frame([x - 20, 159], [x + 19, 159]) + frame([x, 158], [x, y]) + pad([x - 17, y], [x + 18, y]);

  function tower(x) {
    const plates = Array.from({ length: 7 }, (_, index) => rect("illustration-plate", x - 9, 112 + index * 5, 18, 3));
    return rect("illustration-stack", x - 15, 22, 30, 137, 5)
      + frame([x - 20, 159], [x + 20, 159])
      + cable([x, 30], [x, 113]) + plates.join("") + pivot([x, 31]);
  }

  const surfaces = {
    flat: frame([67, 158], [67, 116], [145, 116], [145, 158]) + pad([63, 116], [153, 116]),
    incline: frame([74, 158], [96, 101], [127, 117], [127, 158]) + pad([74, 74], [121, 115], [145, 115]),
    decline: frame([72, 158], [72, 125], [150, 103], [150, 158])
      + pad([63, 126], [152, 103]) + lever([149, 102], [172, 109]) + pad([167, 113], [177, 113]),
    upright: seat() + frame([88, 150], [88, 67]) + pad([94, 66], [94, 113]),
    inclinedSeat: frame([88, 158], [108, 106], [126, 116], [126, 157]) + pad([76, 70], [121, 116], [145, 116]),
    thrust: frame([53, 159], [53, 120], [94, 120], [94, 159]) + pad([49, 120], [97, 120]),
    mat: rect("illustration-mat", 44, 154, 151, 8),
    step: rect("illustration-stack", 124, 124, 37, 34) + pad([123, 124], [162, 124]),
  };

  function dumbbell([x, y], vertical = false) {
    const handle = lever([x - 8, y], [x + 8, y])
      + rect("illustration-plate", x - 10, y - 5, 5, 10)
      + rect("illustration-plate", x + 5, y - 5, 5, 10);
    return vertical ? `<g transform="rotate(90 ${x} ${y})">${handle}</g>` : handle;
  }

  function rack(smith) {
    return frame([49, 157], [49, 23], [191, 23], [191, 157])
      + frame([38, 158], [66, 158]) + frame([176, 158], [204, 158])
      + (smith ? cable([58, 28], [58, 150]) + cable([182, 28], [182, 150])
        : [55, 68, 81, 94].map((y) => pivot([49, y]) + pivot([191, y])).join(""));
  }

  function bar(placement, pose, guided) {
    const hand = pose.arms[1][1];
    const center = placement === "shoulder" ? [120, pose.shoulders[1][1] - 7] : hand;
    const half = pose.front ? 55 : 38;
    const left = guided ? 57 : center[0] - half;
    const right = guided ? 183 : center[0] + half;
    const y = center[1];
    return lever([left, y], [right, y])
      + rect("illustration-plate", left + 4, y - 9, 8, 18)
      + rect("illustration-plate", right - 12, y - 9, 8, 18);
  }

  function machineBase(anchor = 192) {
    return tower(anchor) + frame([75, 158], [anchor, 158]);
  }

  function grip(pose, variant) {
    const [first, second] = pose.arms.map((arm) => arm[1]);
    if (variant.includes("rope")) return cable(offset(second, -5, -8), first, second) + pivot(first) + pivot(second);
    if (variant.includes("triangle")) return lever(offset(second, -8, -11), first, second, offset(second, -8, -11));
    if (variant.includes("bar") || ["wide", "short"].includes(variant)) {
      return lever([first[0] - 10, first[1]], [second[0] + 10, second[1]]);
    }
    return pivot(second);
  }

  function drawCable(pose, variant, double = false) {
    const [left, right] = pose.arms.map((arm) => arm[1]);
    const pulleyY = variant.startsWith("low") ? 142 : variant.startsWith("high") ? 34 : variant.startsWith("face") ? 55 : 81;
    if (double) {
      return tower(37) + tower(203) + frame([37, 22], [203, 22]) + pivot([51, pulleyY]) + pivot([189, pulleyY])
        + cable([51, pulleyY], left) + cable([189, pulleyY], right) + pivot(left) + pivot(right);
    }
    const rear = variant.includes("rear");
    const x = rear ? 45 : 197;
    const endpoint = variant.includes("ankle") ? pose.legs[1][1] : right;
    const pulley = [x + (rear ? 14 : -14), pulleyY];
    return tower(x) + pivot(pulley) + cable(pulley, endpoint)
      + (variant.includes("ankle") ? pad(offset(endpoint, -5, 0), offset(endpoint, 5, 0)) : grip(pose, variant));
  }

  function drawMachine(name, pose, variant) {
    const [left, hand] = pose.arms.map((arm) => arm[1]);
    const knee = pose.legs[1][0];
    const foot = pose.legs[1][1];
    switch (name) {
      case "chestMachine":
        return machineBase() + surfaces.upright + frame([193, 43], [158, 43], [151, 61])
          + lever([192, 52], [174, 57], hand) + pivot([192, 52]) + pivot(hand);
      case "overheadMachine":
        return machineBase() + surfaces.upright + frame([55, 155], [55, 48], [190, 48])
          + lever([57, 55], [76, 38], left) + lever([186, 55], [164, 38], hand) + pivot([57, 55]) + pivot([186, 55]);
      case "flyMachine":
        return machineBase(121) + (variant === "reverse" ? pad([111, 89], [129, 89]) : pad([120, 74], [120, 113])) + seat(120, 120)
          + lever([76, 49], [75, 69], left) + lever([164, 49], [165, 69], hand) + frame([76, 49], [76, 35], [164, 35], [164, 49]);
      case "lateralMachine":
        return machineBase(120) + seat(120, 121) + pad([120, 77], [120, 111])
          + lever([119, 105], [72, 105], [73, 76]) + lever([121, 105], [168, 105], [167, 76])
          + pad([71, 79], [86, 83]) + pad([154, 83], [169, 79]);
      case "latMachine": {
        const middle = [(left[0] + hand[0]) / 2, hand[1]];
        return machineBase() + seat(119, 122) + frame([190, 31], [120, 31])
          + cable([120, 31], offset(middle, 0, variant === "triangle" ? -10 : 0))
          + frame([91, 157], [91, 117], [104, 117]) + pad([101, 118], [138, 118]) + grip(pose, variant);
      }
      case "rowMachine":
        return machineBase() + seat(110, 118) + frame([171, 155], [185, 115], [193, 66])
          + lever([190, variant === "high" ? 51 : 112], [165, hand[1] + 10], hand)
          + (variant === "pad" ? frame([149, 155], [149, 99]) + pad([132, 78], [132, 103]) : pad([162, 151], [181, 142]));
      case "cableRow":
        return tower(200) + frame([82, 157], [82, 119], [132, 119], [132, 157], [199, 157])
          + pad([79, 119], [133, 119]) + pad([174, 150], [188, 136]) + cable([187, 136], hand) + grip(pose, variant);
      case "tBar":
        return frame([61, 158], [113, 95], [154, 158], [185, 158]) + pad([75, 78], [120, 111])
          + pad([139, 154], [167, 154]) + lever([64, 156], [110, 106]) + circle("illustration-plate", [86, 133], 12) + pivot(hand);
      case "assist": {
        const isDip = variant === "dip";
        const y = isDip ? 131 : 117;
        return tower(184) + frame([53, 158], [53, 28], [185, 28])
          + frame([54, 156], [68, 156], [68, 142], [84, 142])
          + lever([172, 119], [172, y], [121, y]) + pad([101, y], [138, y])
          + (isDip ? lever([55, 95], [93, 95]) + lever([185, 95], [148, 95]) : lever([69, 28], [169, 28]));
      }
      case "pulloverMachine":
        return machineBase() + surfaces.upright + frame([186, 157], [186, 62], [162, 54])
          + lever([162, 54], [167, 80], [154, 88]) + pad([148, 87], [158, 92]) + pivot([162, 54]);
      case "backMachine":
        return machineBase(177) + seat(113, 120) + lever([159, 100], [127, 70], [96, 71])
          + pad([88, 73], [100, 77]) + pad([133, 115], [154, 115]) + pivot([159, 100]);
      case "curlMachine":
        return machineBase() + seat(105, 122) + frame([142, 155], [142, 99])
          + pad([119, 83], [145, 101]) + lever([166, 109], [168, 88], hand) + pivot([166, 109]);
      case "dipMachine":
        return machineBase() + surfaces.upright + lever([188, 82], [155, 100], hand) + pivot([188, 82]) + pivot(hand);
      case "legPress":
        return frame([52, 156], [190, 156], [190, 66]) + frame([96, 153], [190, 61])
          + frame([112, 156], [202, 65]) + pad([73, 106], [106, 142], [121, 142])
          + lever([149, 64], [175, 93]) + circle("illustration-plate", [181, 88], 13) + pivot([181, 88]);
      case "horizontalPress":
        return machineBase(204) + frame([77, 149], [183, 149]) + surfaces.upright
          + frame([174, 149], [174, 121]) + lever([187, 94], [187, 130]);
      case "hack":
        return frame([65, 158], [203, 158], [195, 45]) + frame([81, 156], [159, 49])
          + frame([99, 157], [178, 47]) + pad([102, 112], [126, 76]) + pad([115, 76], [136, 76])
          + lever([122, 154], [166, 147]) + circle("illustration-plate", [155, 106], 12);
      case "pendulum":
        return frame([48, 157], [204, 157], [190, 43]) + lever([191, 49], [172, 73], [119, 79])
          + pad([103, 82], [101, 119]) + pad([105, 75], [128, 75])
          + lever([122, 155], [170, 149]) + circle("illustration-plate", [183, 77], 14) + pivot([191, 49]);
      case "belt":
        return rect("illustration-stack", 60, 155, 123, 8) + frame([60, 155], [60, 83], [80, 83])
          + frame([182, 155], [182, 83], [161, 83]) + pad([108, 116], [132, 116])
          + cable([120, 119], [120, 153], [172, 153]) + circle("illustration-plate", [174, 141], 10);
      case "legLever":
        return machineBase() + surfaces.upright + pivot([148, 120])
          + lever([148, 120], offset(foot, variant === "curl" ? -5 : 2, 3))
          + pad(offset(foot, -4, 1), offset(foot, 6, 1))
          + (variant === "curl" ? pad([126, 114], [152, 114]) : "");
      case "lyingCurl":
        return tower(46) + frame([48, 155], [156, 155], [156, 118], [99, 118], [99, 155])
          + pad([92, 118], [172, 118]) + lever([85, 117], offset(foot, -3, 4)) + pad(offset(foot, -6, 4), offset(foot, 4, 4));
      case "standingCurl":
        return machineBase() + frame([146, 154], [146, 79], [159, 79])
          + pad([118, 92], [123, 112]) + lever([136, 130], offset(foot, -4, 0))
          + pad(offset(foot, -7, 3), offset(foot, 3, 3));
      case "hipMachine": {
        const outer = variant === "outer";
        const x = pose.legs[1][0][0] + (outer ? 7 : -8);
        return machineBase(121) + seat(120, 120) + pad([120, 74], [120, 113])
          + lever([120, 140], [x, 140], [x, 128]) + lever([120, 140], [240 - x, 140], [240 - x, 128])
          + pad([x, 120], [x, 132]) + pad([240 - x, 120], [240 - x, 132]);
      }
      case "kickbackMachine":
        return machineBase() + frame([140, 155], [140, 86], [161, 86]) + pad([129, 91], [142, 105])
          + lever([133, 139], [93, 135], offset(foot, -6, 0)) + pad(offset(foot, -7, -5), offset(foot, -7, 6));
      case "thrustMachine":
        return frame([45, 156], [195, 156], [177, 126]) + surfaces.thrust + lever([78, 148], [110, 120], [140, 116])
          + pad([132, 113], [144, 113]) + circle("illustration-plate", [102, 133], 12) + rect("illustration-stack", 147, 153, 38, 6);
      case "calfMachine":
        return machineBase() + frame([69, 154], [69, 43], [190, 43])
          + lever([186, 47], [138, 47], [113, 53]) + pad([102, 50], [124, 50]) + rect("illustration-stack", 100, 153, 42, 6);
      case "seatedCalfMachine":
        return seat(106, 119) + frame([75, 158], [177, 158], [177, 126])
          + lever([177, 123], [148, 111], [127, 112]) + pad([133, 109], [153, 109])
          + circle("illustration-plate", [171, 110], 12) + rect("illustration-stack", 146, 151, 25, 7);
      case "crunchMachine":
        return machineBase() + seat(106, 125) + frame([178, 158], [178, 74], [157, 65])
          + lever([157, 65], [156, 84], hand) + pad([130, 90], [145, 89]) + pivot([157, 65]);
      case "rotationMachine":
        return machineBase() + seat(120, 125) + frame([165, 155], [165, 67], [131, 67])
          + lever([87, 91], [87, 75], [111, 69]) + lever([153, 91], [153, 75], [134, 70])
          + pad([99, 106], [99, 130]) + pad([141, 106], [141, 130]);
      default:
        throw new Error(`Unbekannte Maschinenillustration: ${name}`);
    }
  }

  function equipmentLayers(scene, pose) {
    const { equipment, variant } = scene;
    const [far, near] = pose.arms.map((arm) => arm[1]);
    const hip = pose.hips[1];
    const knee = pose.legs[1][0];
    const benchType = equipment.endsWith("Decline") ? "decline" : equipment.endsWith("Incline") ? "incline"
      : equipment.endsWith("Bench") ? "flat" : equipment.endsWith("Seat") ? "upright" : "";
    if (equipment.startsWith("dumbbell")) {
      const single = equipment.startsWith("dumbbell") && !equipment.startsWith("dumbbells");
      let base = surfaces[benchType] ?? "";
      if (equipment === "dumbbellsMat") base = surfaces.mat;
      if (equipment === "dumbbellsSeatInclined") base = surfaces.inclinedSeat;
      if (equipment === "dumbbellsBox") base = variant === "bench"
        ? frame([49, 158], [49, 125], [77, 125], [77, 158]) + pad([44, 125], [79, 125]) : surfaces.step;
      if (equipment === "dumbbellPreacher") base = seat() + frame([138, 156], [138, 98]) + pad([120, 86], [145, 103]);
      if (equipment === "dumbbellSupport") base = frame([68, 158], [68, 63]);
      const vertical = equipment === "dumbbellsVertical" || equipment === "dumbbellVertical";
      return [base, (single ? "" : dumbbell(far, vertical)) + dumbbell(near, vertical)];
    }
    if (equipment.startsWith("smith") || equipment.startsWith("bar")) {
      const isSmith = equipment.startsWith("smith");
      let base = isSmith || equipment !== "bar" && equipment !== "barThrust" ? rack(isSmith) : "";
      base += surfaces[benchType] ?? "";
      if (equipment.endsWith("Thrust")) base += surfaces.thrust;
      if (equipment === "smithBlock") base += rect("illustration-stack", 90, 150, 65, 9);
      const barPose = equipment.endsWith("Thrust") ? { ...pose, arms: [[hip, hip], [hip, offset(hip, 0, -8)]] } : pose;
      return [base, bar(variant, barPose, isSmith)];
    }
    if (equipment === "doubleCable") return [drawCable(pose, variant, true), ""];
    if (equipment === "cable" || equipment === "cableMat") {
      return [(equipment === "cableMat" ? surfaces.mat : "") + drawCable(pose, variant), ""];
    }
    if (equipment === "weightedThrust") return [surfaces.thrust, dumbbell(offset(hip, 0, -9))];
    if (equipment === "weightedBridge") return [surfaces.mat, dumbbell(offset(hip, 0, -7))];
    if (equipment === "weightedCalf") return [seat(), dumbbell(offset(knee, 0, -8))];
    if (equipment === "weightedCrunch") return [surfaces.mat, dumbbell(near)];
    if (equipment === "mat") return [surfaces.mat, ""];
    if (equipment === "pushUpBench") return [frame([137, 158], [137, 128], [179, 128], [179, 158]) + pad([133, 127], [184, 127]), ""];
    if (equipment === "pullUpFrame") return [frame([64, 158], [64, 28], [175, 28], [175, 158]), ""];
    if (equipment === "invertedFrame") return [frame([63, 158], [63, 52], [184, 52], [184, 158]), ""];
    return [drawMachine(equipment, pose, variant), ""];
  }

  function drawPerson(pose) {
    const torso = pose.front ? [...pose.shoulders, offset(pose.hips[1], 4, 1), offset(pose.hips[0], -4, 1)] : (() => {
      const shoulder = pose.shoulders[1];
      const hip = pose.hips[1];
      const dx = hip[0] - shoulder[0];
      const dy = hip[1] - shoulder[1];
      const length = Math.hypot(dx, dy);
      const [x, y] = [dy / length, -dx / length];
      return [offset(shoulder, x * 8, y * 8), offset(shoulder, -x * 8, -y * 8),
        offset(hip, -x * 7, -y * 7), offset(hip, x * 7, y * 7)];
    })();
    const limbs = [0, 1].map((index) => {
      const [elbow, hand] = pose.arms[index];
      const [knee, foot] = pose.legs[index];
      const shoe = pose.front ? offset(foot, index ? 9 : -9, 2) : offset(foot, 8, pose.heelRaised ? 10 : 4);
      return `<g class="${index ? "illustration-near" : "illustration-far"}">`
        + line("illustration-leg", pose.hips[index], knee, foot)
        + line("illustration-shoe", foot, shoe)
        + line("illustration-arm", pose.shoulders[index], elbow, hand) + "</g>";
    });
    const [leftShoulder, rightShoulder] = pose.shoulders;
    const collar = leftShoulder.map((coordinate, axis) => (coordinate + rightShoulder[axis]) / 2);
    return limbs[0] + line("illustration-neck", pose.head, collar)
      + `<polygon class="illustration-shirt" points="${torso.join(" ")}"/>`
      + limbs[1] + circle("illustration-head", pose.head, 10);
  }

  function create(exercise) {
    const scene = exerciseScenes.get(exercise.id);
    if (!scene) return null;
    const pose = poses[scene.pose];
    const [behind, inFront] = equipmentLayers(scene, pose);
    const svg = document.createElementNS(namespace, "svg");
    svg.classList.add("exercise-illustration");
    svg.setAttribute("viewBox", "0 0 240 174");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${exercise.name}. Beispielposition mit ${exercise.gear}.`);
    svg.innerHTML = frame([23, 160], [217, 160]) + behind + drawPerson(pose) + inFront;
    return svg;
  }

  return { create };
})();
