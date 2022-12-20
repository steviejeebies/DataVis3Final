let img;
let map_X = 40;
let map_Y = 40;
let map_width;
let map_height;
let homelessTable;
let table;
let tablePopulationCount;
let CountyRegionData;
let button;
let count = 0;

let playPause = false;
let previousTime = 0;
let slider;
let prevSliderVal = 0;
let sliderVal = 0;
let sliderMin = 0;
let sliderMax = homelessness_data_files.length - 1;
let sliderStep = 1;

let maxTotalAdultsHomeless = 5250;
let maxPercentAdultsHomeless = 0.0036244546601953125;

let homeless_data = [];

let map;
let path;

let update = false;

let maxHomelessPercent = 0;

let currentCounty = null;
let countyToCompareTo = null;

let currentYear = 2019;

let realValues = true;

let countyGraph = false;

function preload() {
  // img = loadImage("images/republic_of_ireland_base.png");
  homelessTable = loadTable(
    "data/homeless_by_age_and_gender/homeless_by_age_male_and_female.csv",
    "csv",
    "header"
  );
  tablePopulationCount = loadTable(
    "data/population_by_county.csv",
    "csv",
    "header"
  );

  for (let filename of homelessness_data_files) {
    homeless_data.push(
      loadTable("data/homeless_by_region/" + filename, "csv", "header")
    );
  }
}

function setup() {
  canvas = createCanvas(1800, 75);
  canvas.parent("p5canvas");
  // map_width = img.width / 8;
  // map_height = img.height / 8;
  // console.log(map_width);
  // console.log(map_height);

  // map();

  slider = createSlider(sliderMin, sliderMax, sliderVal, sliderStep);
  slider.position(150, 22);
  slider.style("width", "400px");

  populationPyramid();
  newMap();
  getAllPopulationData();

  // Play/Pause button
  myButton = new Button({
    x: 75,
    y: 35,
    width: 100,
    height: 30,
    align_x: 0,
    align_y: 0,
    content: playPause ? "Pause" : "Play",
    on_press() {
      previousTime = millis();
      playPause = !playPause;
      myButton.text(playPause ? "Pause" : "Play");
    },
  });

  // Stacked chart toggle button
  let button1 = document.createElement("button");
  button1.innerHTML = "Change to percentage";
  button1.onclick = function () {
    realValues = !realValues;
    button1.innerHTML = !realValues
      ? "Change to real values"
      : "Change to percentage";
    stackedColumnChart();
    return false;
  };
  document.getElementById("stackedChartButton").appendChild(button1);

  let button2 = document.createElement("button");
  button2.innerHTML = "Close";
  button2.onclick = function () {
    $("#tooltipContainer").hide();
    $("#otherGraphs").show();
    countyGraph = false;
    return false;
  };
  document.getElementById("countyGraphClose").appendChild(button2);

  currentYear = getTimeSpanData().year;
  stackedColumnChart();
}

function draw() {
  // image(
  //   img,
  //   map_X,
  //   map_Y,
  //   map_width,
  //   map_height,
  //   0,
  //   0,
  //   img.width,
  //   img.height,
  //   "CONTAIN",
  //   "LEFT"
  // );
  background(100, 100, 100);
  fill(255, 255, 255);

  let { year, monthName, quarter } = getTimeSpanData();

  textSize(30);
  text(`${monthName} ${year} (${quarter})`, 350, 60);
  myButton.draw();
  myButton.update({ content: playPause ? "Pause" : "Play" });
  if (playPause) updateTime();

  sliderVal = slider.value();

  if (update == true || sliderVal !== prevSliderVal) {
    updateMap();
    stackedColumnChart();
    try {
      donutChart();
    } catch (e) {}

    currentYear = getTimeSpanData().year;
    console.log(currentYear);

    prevSliderVal = sliderVal;
    update = false;
  }
}

function updateTime() {
  if (millis() > previousTime + 0.5 * 1000) {
    previousTime = millis();
    slider.value((slider.value() + sliderStep) % (sliderMax + 1));
    update = true;
  }
}

function getTimeSpanData() {
  let [year, monthNum, monthName, quarter] = homelessness_data_files[sliderVal]
    .split(".")[0]
    .split("_");

  return { year, monthNum, monthName, quarter };
}

function getAllPopulationData() {
  for (let r = 0; r < tablePopulationCount.getRowCount() - 1; r++) {
    const { County, ...yearPopulations } = tablePopulationCount.rows[r].obj;

    county_data[County].populations = yearPopulations;

    region = county_data[County].region;

    if (!region_data[region]?.populations) region_data[region].populations = {};

    for (let year of Object.keys(yearPopulations)) {
      populationCount = parseNum(yearPopulations[year]);

      if (!region_data[county_data[County].region].populations[year])
        region_data[county_data[County].region].populations[year] =
          populationCount;
      else
        region_data[county_data[County].region].populations[year] +=
          populationCount;
    }
  }
}

function populationPyramid() {
  bigTable = [];
  let table = homelessTable;

  for (let r = 0; r < table.getRowCount() - 1; r++) {
    bigTable.push({
      age: table.rows[r + 1].obj.Age_Group.replaceAll(" years", ""),
      sex: table.rows[r + 1].obj.Sex,
      value: parseInt(table.rows[r + 1].obj.VALUE),
    });
  }

  let width = 1000, // width of svg
    scaleFactor = 1,
    barHeight = 20; // Height of horizontal bars
  let margin = { right: 0, left: 400, y: 20, x: 0 }; // used by age range
  let maleMargin = { right: 0, left: 450 };
  let femaleMargin = { right: -140, left: -165 };

  xF = d3.scale
    .linear()
    .domain([0, 100 / scaleFactor])
    .rangeRound([width / 2, margin.left]);

  xM = d3.scale
    .linear()
    .domain(xF.domain())
    .rangeRound([width / 2, width - margin.right]);

  let graph = d3
    .select("#pyramid")
    .append("svg")
    .attr("width", width)
    .attr("height", 300)
    .attr("viewBox", "-50 0 1000 350") // (- = move left, + = move up, + = zoom out, + = move down)
    .attr("class", "svg-style-population-pyramid");

  let bar = graph
    .selectAll("g")
    .data(bigTable)
    .enter()
    .append("g")
    .attr("transform", function (d, i) {
      // translate here sets the how far apart the bars should be
      if (d.sex === "Male") {
        return "translate(20," + i * margin.y + ")";
      }
      let numberMaleRows = Math.floor(table.getRowCount() / 2);
      return "translate(20," + (i - numberMaleRows) * margin.y + ")"; // (x axis, y axis)
    });

  // SIZE AND COLOUR OF BARS
  bar
    .append("rect")
    .attr(
      "x",
      (d) => (d.sex === "Male" ? null : xF(d.value) + femaleMargin.right) // Flips the female data
    )
    .attr("width", function (d) {
      if (d.sex === "Male") {
        xM(d.value) - xM(0);
      }
      return xF(0) - xF(d.value);
    })
    .attr("height", barHeight - 1)
    .attr("transform", function (d, i) {
      if (d.sex === "Male") {
        return "translate(" + maleMargin.left + ", 0)"; // translate here repositions the bar horizontally or vertically
      }
      return null;
    })
    .style("fill", (d) => (d.sex === "Male" ? "#02A3FE" : "#EC49A6")); // Colour of bars

  // COUNT NUMBER
  bar
    .append("text")
    .attr("x", function (d) {
      if (d.sex === "Male") {
        return d.value * scaleFactor + maleMargin.left;
      }
      return xF(d.value) + femaleMargin.left;
    })
    .attr("y", barHeight / 2)
    .attr("dy", ".35em")
    .text(function (d) {
      return d.value;
    });

  // AGE RANGE LABEL
  bar
    .append("text")
    .attr("x", function (d) {
      return margin.left;
    })
    .attr("y", barHeight / 2)
    .attr("dx", -20)
    .attr("dy", ".35em")
    .text(function (d) {
      if (d.sex === "Male") {
        return d.age;
      }
      return null;
    });
}

function parseNum(stringNum) {
  return parseInt(stringNum.replaceAll(",", ""));
}

function updateMap() {
  map
    .enter()
    .append("path")
    .attr("class", function (d, i) {
      let badge = "f0";
      return "ward ward-" + d.properties.id + " " + badge;
    })
    .attr("d", path)
    .attr("fill", function (d, i) {
      regionOfThisCounty = county_data[d.properties.NAME_1].region;

      regionHomelessData = homeless_data[sliderVal].rows.find(
        (entry) => entry.obj.Region == regionOfThisCounty
      );

      let { year } = getTimeSpanData();

      totalHomeless = parseNum(regionHomelessData.obj["Total Adults"]);

      interpolatedValue =
        totalHomeless /
        region_data[regionOfThisCounty].populations[year] /
        maxPercentAdultsHomeless;

      if (
        totalHomeless / region_data[regionOfThisCounty].populations[year] >
        maxHomelessPercent
      ) {
        maxHomelessPercent =
          totalHomeless / region_data[regionOfThisCounty].populations[year];
        console.log(maxHomelessPercent);
      }
      return d3.interpolateBlues(interpolatedValue);
    });
}

function generateDropdownEntries(currentCounty) {
  let str = `<option></option>`;
  for (let county in county_data) {
    if (county == currentCounty) continue;
    str += `<option value="${county}">${county}</option>`;
  }
  return str;
}

function loadCompareGraph() {
  countyToCompareTo = document.getElementById("selectCountry").value;
  document.getElementById("rentImage").innerHTML = "";

  // console.log(`countyToCompareTo = ${countyToCompareTo}`)

  if (countyToCompareTo == "") {
    $("#rentImage").load(`./plotly_pregenerated/${currentCounty}.html`);
    return;
  }

  let [countryA, countryB] = [currentCounty, countyToCompareTo].sort();

  $("#rentImage").load(
    `./plotly_pregenerated/compare/${countryA}_${countryB}.html`
  );
}

function newMap() {
  let width = 460;
  let height = 650;

  let projection = d3.geo
    .albers()
    .center([-8.5, 53.4129])
    .rotate([0, 0])
    .parallels([50, 50])
    .scale(9000)
    .translate([width / 2, height / 2]);
  path = d3.geo.path().projection(projection);

  let svg = d3
    .select("#mapMap")
    .append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", "0 0 " + width + " " + height)
  let mapContainer = svg.append("g");

  $("#tooltipContainer").hide();
  let tooltip = d3.select("#regionTitle").attr("class", "tooltip");
  tooltip.html("");

  queue()
    .defer(d3.json, "data/ireland.json")
    .await(mapReady);

  let featuresForMap;

  function mapReady(error, ireland) {
    featuresForMap = topojson.feature(ireland, ireland.objects.IRL_adm1).features;
    map = mapContainer
      .append("g")
      .attr("class", "borders")
      .selectAll("path")
      .data(featuresForMap);
    let content;

    updateMap();
    //   //Show/hide tooltip
    map.on("click", function (d, i) {
      console.log('click')
      countyToCompareTo = null;
      $("#tooltipContainer").show();
      $("#otherGraphs").hide();
      countyGraph = true;
      
      currentCounty = d.properties.NAME_1;
      reg = county_data[currentCounty].region;
      content = "<h2>" + reg + ' [' + region_data[reg].counties + "]</h2>";
      tooltip.html(content);

      document.getElementById(
        "rentCompareDropdown"
      ).innerHTML = `<label for="membership"><b>Compare Co. ${currentCounty}'s Rent With: </b></label><select id='selectCountry' onchange="loadCompareGraph()">${generateDropdownEntries(
        currentCounty
      )}</select>`;

      donutChart();

      $("#rentImage").load(`./plotly_pregenerated/${currentCounty}.html`);
    });
  }
}

function donutChart() {
  regions = homeless_data[sliderVal].rows.map((a) => a.obj["Region"]);
  selectedRegion = county_data[currentCounty].region;
  let pullArray = new Array(regions.length).fill(0);
  pullArray[regions.indexOf(selectedRegion)] = 0.2;

  let data = [
    {
      values: homeless_data[sliderVal].rows.map(
        (a) =>
          parseNum(a.obj["Total Adults"]) /
          region_data[a.obj["Region"]].populations[currentYear]
      ),
      labels: regions,
      textposition: "inside",
      domain: { column: 0 },
      name: "",
      hovertemplate: "%{value:%} of %{label}'s Population are Homeless",
      hole: 0.6,
      type: "pie",
      pull: pullArray,
    },
    {
      values: homeless_data[sliderVal].rows.map((a) =>
        parseNum(a.obj["Total Adults"])
      ),
      labels: regions,
      domain: { column: 1 },
      name: "",
      texttemplate: "%{value} (%{percent})",
      hole: 0.6,
      type: "pie",
      pull: pullArray,
    }
  ];

  let { year, monthName } = getTimeSpanData()

  let layout = {
    title: `Adult Homelessness in Ireland (by statistical region) in ${monthName} ${year}`,
    annotations: [
      {
        font: {
          size: 17,
        },
        showarrow: false,
        text: "Total (Adult)",
        x: 0.91,
        y: 0.5,
      },
      {
        font: {
          size: 17,
        },
        showarrow: false,
        text: "Per Capita",
        x: 0.14,
        y: 0.57,
      },
      {
        font: {
          size: 17,
        },
        showarrow: false,
        text: "(By region)",
        x: 0.14,
        y: 0.46,
      },
    ],
    height: 375,
    width: 600,
    showlegend: true,
    legend: { orientation: "h" },
    grid: { rows: 1, columns: 2 },
  };

  Plotly.newPlot("donutChart", data, layout);
}

function stackedColumnChart() {
  regions = homeless_data[sliderVal].rows.map((a) => a.obj["Region"]);

  let cat1 = {
      name: "Adults (Without Families)",
      x: regions,
      y: homeless_data[sliderVal].rows.map(
        (a) =>
          parseNum(a.obj["Total Adults"]) -
          parseNum(a.obj["Number of Adults in Families"])
      ),
      type: "bar",
    },
    cat2 = {
      name: "Adults (In Family)",
      x: regions,
      y: homeless_data[sliderVal].rows.map(
        (a) => a.obj["Number of Adults in Families"]
      ),
      type: "bar",
    },
    cat3 = {
      name: "Dependants (In Family, Under 18)",
      x: regions,
      y: homeless_data[sliderVal].rows.map(
        (a) => a.obj["Number of Dependants in Families"]
      ),
      type: "bar",
    };

  let graphData = [cat1, cat2, cat3];
  let layout;
  if (realValues) {
    cat3.hovertemplate = "";
    cat3.text = homeless_data[sliderVal].rows.map((a) =>
      String(
        parseNum(a.obj["Total Adults"]) +
          parseNum(a.obj["Number of Dependants in Families"])
      )
    );

    layout = {
      title: "Total Count + Family Composition of Homeless People, By Region",
      barmode: "stack",
      yaxis: {
        autorange: false,
        range: [0, 8000],
        title: "Homeless Individuals (Count)",
      },
      xaxis: { title: "Irish Statistical Regions" },
    };
    Plotly.newPlot("stackedChart", graphData, layout);
  } else {
    cat1.texttemplate= '%{value:.01f}%'
    cat2.texttemplate= '%{value:.01f}%'
    cat3.texttemplate= '%{value:.01f}%'
    layout = {
      title: "Colored Bar Chart",
      barmode: "stack",
      barnorm: "percent",
      yaxis: { title: "Percentage of Homeless Population" },
      xaxis: { title: "Irish Statistical Regions" },
    };
    Plotly.newPlot("stackedChart", graphData, layout);
  }
}
