// dashboard config
const CHART_MARGIN = { top: 20, right: 30, bottom: 40, left: 60 };
const CONTEXT_HEIGHT = 60;
const BRUSH_DEBOUNCE_MS = 50;
const PANEL_OPTIONS = ["timeline", "neighborhood", "department", "status", "map", "priority", "method", "serviceType"];

// colors for top service types
const SERVICE_TYPE_COLOR_DEFAULTS = {
  "POTHOLE, REPAIR": "#E63946",
  "TRASH, BULK ITEM PICK-UP": "#F77F00",
  "METAL FURNITURE, SPEC COLLECTN": "#457B9D",
  "SLIPPERY STREETS, REQUEST": "#1D3557",
  "TRASH, MISSED COLLECTION": "#06A77D",
  "BUILDING, RESIDENTIAL": "#8E44AD",
  "VEHICLE, OVERTIME PARKER": "#D4A017",
  "LITTER, PRIVATE PROPERTY": "#2ECC71",
  "311 ASSISTANCE": "#FF6B6B",
  "TALL GRASS/WEEDS, PRIVATE PROP": "#4ECDC4",
  "TRASH, REQUEST FOR COLLECTION": "#C7A94F",
  "ICY, SNOWY STREETS": "#95E1D3",
  "SIGN, DOWN/MISSING": "#F38181",
  "TRASH, IMPROPER SET OUT": "#AA96DA",
  "SIGNAL, TRAF/PED/SCHOOL REPAIR": "#6C5B7B",
};

const DEFAULT_SELECTIONS = {
  activePanel: "timeline",
  statusFilter: "",
  neighborhoodFilter: "",
  dateRangeStart: "2025-01-01",
  dateRangeEnd: "2026-12-31",
  addressQuery: ""
};

let appState = null;

// load csv and build app state
d3.csv(DATA_CONFIG.serviceData).then(data => {
  const processedData = data.map(d => {
    const dateClosed = d.date_closed ? new Date(d.date_closed) : null;
    return {
      srNumber: d.sr_number,
      serviceType: (d.sr_type_desc || "Unknown").trim(),
      status: (dateClosed && !isNaN(dateClosed)) ? "CLOSED" : "OPEN",
      neighborhood: d.neighborhood || "",
      deptName: d.dept_name || "",
      priority: d.priority || "",
      method: d.method_received || "",
      dateCreated: new Date(d.date_created),
      dateClosed: dateClosed,
      latitude: +d.latitude,
      longitude: +d.longitude
    };
  }).filter(d => d.dateCreated && !isNaN(d.dateCreated));

  const neighborhoods = [...new Set(processedData.map(d => d.neighborhood))].filter(Boolean).sort();
  const statuses = [...new Set(processedData.map(d => d.status))].sort();
  const serviceTypes = [...new Set(processedData.map(d => d.serviceType))].sort();

  // color each type
  const serviceTypeColors = {};
  serviceTypes.forEach((type, idx) => {
    serviceTypeColors[type] = SERVICE_TYPE_COLOR_DEFAULTS[type]
      || d3.interpolateRainbow(idx / serviceTypes.length);
  });

  appState = {
    data: processedData,
    deptData: processedData,   // same data, dept charts read from here
    neighborhoods,
    statuses,
    serviceTypes,
    serviceTypeColors,
    addresses: [],
    selections: { ...DEFAULT_SELECTIONS },
    brushSelection: null,
    selectedDepartments: [],
    selectedPriorities: [],
    selectedMethods: [],
    selectedServiceTypes: []
  };

  console.log("Loaded", processedData.length, "service requests,", serviceTypes.length, "types");

  setupFilters();
  bindEvents();
  syncUrlState();
  renderDashboard();
  window.addEventListener("resize", debounce(renderDashboard, 150));
});

function setupFilters() {
  // Setup neighborhood filter
  const neighborhoodSelect = d3.select("#neighborhoodFilter");
  neighborhoodSelect
    .selectAll("option.neighborhood-option")
    .data(appState.neighborhoods)
    .join("option")
    .classed("neighborhood-option", true)
    .attr("value", d => d)
    .text(d => d);

  // Setup address search datalist
  const addressList = d3.select("#addressSearchList");
  addressList
    .selectAll("option")
    .data(appState.addresses)
    .join("option")
    .attr("value", d => d);
}

function bindEvents() {
  // Filter controls
  d3.select("#statusFilter").on("change", event => {
    appState.selections.statusFilter = event.target.value;
    renderDashboard();
  });

  d3.select("#neighborhoodFilter").on("change", event => {
    appState.selections.neighborhoodFilter = event.target.value;
    renderDashboard();
  });

  d3.select("#dateRangeStart").on("change", event => {
    appState.selections.dateRangeStart = event.target.value;
    renderDashboard();
  });

  d3.select("#dateRangeEnd").on("change", event => {
    appState.selections.dateRangeEnd = event.target.value;
    renderDashboard();
  });

  d3.select("#addressSearch").on("input", debounce(event => {
    appState.selections.addressQuery = event.target.value.toLowerCase();
    renderDashboard();
  }, 300));

  d3.select("#resetViewButton").on("click", () => {
    appState.selections = { ...DEFAULT_SELECTIONS };
    appState.brushSelection = null;
    appState.selectedDepartments = [];
    appState.selectedPriorities = [];
    appState.selectedMethods = [];
    appState.selectedServiceTypes = [];
    syncControlsFromState();
    renderDashboard();
  });

  // Tab controls
  d3.selectAll(".tab-button").on("click", function() {
    const selectedPanel = this.dataset.panel;
    if (PANEL_OPTIONS.includes(selectedPanel)) {
      appState.selections.activePanel = selectedPanel;
      syncUrlState();
      renderDashboard();
    }
  });
}

function renderActiveFilters() {
  const container = d3.select("#active-filters");
  container.selectAll("*").remove();

  const filters = [];

  if (appState.brushSelection) {
    const fmt = d3.timeFormat("%b %Y");
    filters.push({
      label: "Date: " + fmt(appState.brushSelection[0]) + " \u2013 " + fmt(appState.brushSelection[1]),
      clear: () => { appState.brushSelection = null; }
    });
  }

  if (appState.selections.neighborhoodFilter) {
    filters.push({
      label: "Neighborhood: " + appState.selections.neighborhoodFilter,
      clear: () => { appState.selections.neighborhoodFilter = ""; syncControlsFromState(); }
    });
  }

  if (appState.selections.statusFilter) {
    filters.push({
      label: "Status: " + appState.selections.statusFilter,
      clear: () => { appState.selections.statusFilter = ""; syncControlsFromState(); }
    });
  }

  if (appState.selectedDepartments.length > 0) {
    filters.push({
      label: "Dept: " + appState.selectedDepartments.join(", "),
      clear: () => { appState.selectedDepartments = []; }
    });
  }

  if (appState.selectedPriorities.length > 0) {
    filters.push({
      label: "Priority: " + appState.selectedPriorities.join(", "),
      clear: () => { appState.selectedPriorities = []; }
    });
  }

  if (appState.selectedMethods.length > 0) {
    filters.push({
      label: "Method: " + appState.selectedMethods.join(", "),
      clear: () => { appState.selectedMethods = []; }
    });
  }

  if (appState.selectedServiceTypes.length > 0) {
    filters.push({
      label: "Service Type: " + appState.selectedServiceTypes.join(", "),
      clear: () => { appState.selectedServiceTypes = []; }
    });
  }

  if (filters.length === 0) return;

  filters.forEach(f => {
    const badge = container.append("span").attr("class", "filter-badge");
    badge.append("span").text(f.label);
    badge.append("button")
      .attr("class", "filter-badge-clear")
      .text("\u00d7")
      .on("click", () => {
        f.clear();
        renderDashboard();
      });
  });
}

function renderDashboard() {
  if (!appState) return;

  updatePanelVisibility();
  renderActiveFilters();

  const filteredData = getFilteredData();

  switch(appState.selections.activePanel) {
    case "timeline":
      renderTimelineChart(filteredData);
      break;
    case "neighborhood":
      // Show all neighborhoods (exclude own filter) so clicking doesn't hide others
      renderNeighborhoodChart(getFilteredData({ excludeNeighborhood: true }));
      break;
    case "department":
      renderDeptChart(getFilteredDeptData({ excludeDepartment: true }));
      break;
    case "priority":
      renderPriorityChart(getFilteredDeptData({ excludePriority: true }));
      break;
    case "method":
      renderMethodChart(getFilteredDeptData({ excludeMethod: true }));
      break;
    case "status":
      // Show all statuses (exclude own filter) so clicking doesn't hide others
      renderStatusChart(getFilteredData({ excludeStatus: true }));
      break;
    case "map":
      renderMapChart(filteredData);
      break;
    case "serviceType":
      renderServiceTypeChart(getFilteredData({ excludeServiceType: true }));
      break;
  }
}

function getFilteredData(options) {
  const opts = options || {};
  let filtered = appState.data;

  // Filter by status (skip if this chart's own selection is excluded)
  if (appState.selections.statusFilter && !opts.excludeStatus) {
    filtered = filtered.filter(d => d.status === appState.selections.statusFilter);
  }

  // Filter by neighborhood (skip if this chart's own selection is excluded)
  if (appState.selections.neighborhoodFilter && !opts.excludeNeighborhood) {
    filtered = filtered.filter(d => d.neighborhood === appState.selections.neighborhoodFilter);
  }

  // Filter by service types (skip if this chart's own selection is excluded)
  if (appState.selectedServiceTypes && appState.selectedServiceTypes.length > 0 && !opts.excludeServiceType) {
    filtered = filtered.filter(d => appState.selectedServiceTypes.includes(d.serviceType));
  }

  // Filter by date range
  const startDate = new Date(appState.selections.dateRangeStart);
  const endDate = new Date(appState.selections.dateRangeEnd);
  filtered = filtered.filter(d => d.dateCreated >= startDate && d.dateCreated <= endDate);

  // Filter by address search
  if (appState.selections.addressQuery) {
    filtered = filtered.filter(d =>
      (d.address || "").toLowerCase().includes(appState.selections.addressQuery)
    );
  }

  // Cross-chart linked selection: timeline brush date range
  if (appState.brushSelection) {
    const [bStart, bEnd] = appState.brushSelection;
    filtered = filtered.filter(d => d.dateCreated >= bStart && d.dateCreated <= bEnd);
  }

  return filtered;
}

// Filtered dept data — exclude flags let a chart skip its own selection
function getFilteredDeptData(options) {
  const opts = options || {};
  let data = appState.deptData;

  if (appState.selections.neighborhoodFilter) {
    data = data.filter(d => d.neighborhood === appState.selections.neighborhoodFilter);
  }

  const startDate = new Date(appState.selections.dateRangeStart);
  const endDate = new Date(appState.selections.dateRangeEnd);
  data = data.filter(d => d.dateCreated >= startDate && d.dateCreated <= endDate);

  // Cross-chart linked selections
  if (appState.brushSelection) {
    const [bStart, bEnd] = appState.brushSelection;
    data = data.filter(d => d.dateCreated >= bStart && d.dateCreated <= bEnd);
  }

  if (appState.selectedDepartments.length > 0 && !opts.excludeDepartment) {
    data = data.filter(d => appState.selectedDepartments.includes(d.deptName));
  }

  if (appState.selectedPriorities.length > 0 && !opts.excludePriority) {
    data = data.filter(d => appState.selectedPriorities.includes(d.priority));
  }

  if (appState.selectedMethods.length > 0 && !opts.excludeMethod) {
    data = data.filter(d => appState.selectedMethods.includes(d.method));
  }

  // also filter dept data by selected service types
  if (appState.selectedServiceTypes.length > 0) {
    data = data.filter(d => appState.selectedServiceTypes.includes(d.serviceType));
  }

  return data;
}

function renderTimelineChart(data) {
  const container = d3.select("#timeline-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const margin = { ...CHART_MARGIN, bottom: CHART_MARGIN.bottom + CONTEXT_HEIGHT + 20 };
  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width - margin.left - margin.right;
  const mainHeight = 300;
  const totalHeight = mainHeight + margin.top + margin.bottom;

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", totalHeight);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Group data by month for timeline
  const dateFormatter = d3.timeFormat("%Y-%m");
  const grouped = d3.rollup(data,
    v => v.length,
    d => dateFormatter(d.dateCreated)
  );

  const timelineData = Array.from(grouped, ([date, count]) => ({
    date: d3.timeParse("%Y-%m")(date),
    count: count
  })).sort((a, b) => a.date - b.date);

  if (timelineData.length === 0) return;

  // Full x domain (used by context brush)
  const fullXDomain = d3.extent(timelineData, d => d.date);

  // Determine visible domain based on brush selection
  const brushSel = appState.brushSelection;
  const focusXDomain = brushSel ? [brushSel[0], brushSel[1]] : fullXDomain;

  // Filter visible data for the main (focus) chart
  const focusData = brushSel
    ? timelineData.filter(d => d.date >= brushSel[0] && d.date <= brushSel[1])
    : timelineData;

  // --- Focus (main) chart scales ---
  const xScale = d3.scaleTime()
    .domain(focusXDomain)
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(focusData, d => d.count) || 1])
    .nice()
    .range([mainHeight, 0]);

  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.count))
    .curve(d3.curveMonotoneX);

  // Clip path so points/line don't overflow during brush zoom
  svg.append("defs").append("clipPath")
    .attr("id", "clip-timeline")
    .append("rect")
    .attr("width", width)
    .attr("height", mainHeight);

  const focusGroup = g.append("g").attr("clip-path", "url(#clip-timeline)");

  // Focus axes
  const xAxis = g.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${mainHeight})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%b %Y")));

  g.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale));

  // Focus line
  focusGroup.append("path")
    .datum(focusData)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Focus dots
  focusGroup.selectAll(".dot")
    .data(focusData)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.count))
    .attr("r", 4)
    .attr("fill", "#2563eb")
    .on("mouseover", (event, d) => {
      showTooltip(event, `
        <strong>${d3.timeFormat("%B %Y")(d.date)}</strong><br/>
        Service Requests: ${d.count}
      `);
    })
    .on("mouseout", hideTooltip);

  // Axis labels
  g.append("text")
    .attr("x", width / 2)
    .attr("y", mainHeight + 35)
    .attr("text-anchor", "middle")
    .text("Date");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -mainHeight / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .text("Number of Reports");

  // --- Context (brush) area below the main chart ---
  const contextY = mainHeight + 50;
  const context = g.append("g")
    .attr("class", "context")
    .attr("transform", `translate(0,${contextY})`);

  const contextXScale = d3.scaleTime()
    .domain(fullXDomain)
    .range([0, width]);

  const contextYScale = d3.scaleLinear()
    .domain([0, d3.max(timelineData, d => d.count) || 1])
    .range([CONTEXT_HEIGHT, 0]);

  const contextLine = d3.line()
    .x(d => contextXScale(d.date))
    .y(d => contextYScale(d.count))
    .curve(d3.curveMonotoneX);

  // Context area fill
  const contextArea = d3.area()
    .x(d => contextXScale(d.date))
    .y0(CONTEXT_HEIGHT)
    .y1(d => contextYScale(d.count))
    .curve(d3.curveMonotoneX);

  context.append("path")
    .datum(timelineData)
    .attr("fill", "#e0e7ff")
    .attr("d", contextArea);

  context.append("path")
    .datum(timelineData)
    .attr("fill", "none")
    .attr("stroke", "#9ca3af")
    .attr("stroke-width", 1)
    .attr("d", contextLine);

  // Context x-axis
  context.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${CONTEXT_HEIGHT})`)
    .call(d3.axisBottom(contextXScale).ticks(6).tickFormat(d3.timeFormat("%b '%y")));

  // Brush — on "end" triggers full dashboard re-render (linked filtering)
  const brush = d3.brushX()
    .extent([[0, 0], [width, CONTEXT_HEIGHT]])
    .on("brush", function(event) {
      if (!event.selection) return;
      const [x0, x1] = event.selection;
      appState.brushSelection = [contextXScale.invert(x0), contextXScale.invert(x1)];
      // Live-update just the timeline focus area while dragging
      debouncedTimelineUpdate();
    })
    .on("end", function(event) {
      if (!event.selection) {
        appState.brushSelection = null;
      } else {
        const [x0, x1] = event.selection;
        appState.brushSelection = [contextXScale.invert(x0), contextXScale.invert(x1)];
      }
      // On release, the brush selection persists and will filter other tabs
    });

  const brushG = context.append("g")
    .attr("class", "brush x-brush")
    .call(brush);

  // Restore brush position if a selection already exists
  if (brushSel) {
    const x0 = contextXScale(brushSel[0]);
    const x1 = contextXScale(brushSel[1]);
    brushG.call(brush.move, [x0, x1]);
  }
}

// Debounced update that re-renders only the focus portion of the timeline
const debouncedTimelineUpdate = debounce(() => {
  if (!appState || appState.selections.activePanel !== "timeline") return;
  const filteredData = getFilteredData();
  renderTimelineChart(filteredData);
}, BRUSH_DEBOUNCE_MS);

function renderNeighborhoodChart(data) {
  const container = d3.select("#neighborhood-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  // group data
  const counts = d3.rollup(data, v => v.length, d => d.neighborhood);

  const chartData = Array.from(counts, ([neighborhood, count]) => ({
    neighborhood,
    count
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const margin = { top: 20, right: 100, bottom: 50, left: 210 };
  const containerRect = container.node().getBoundingClientRect();
  const width  = containerRect.width - margin.left - margin.right;
  const height = Math.max(300, chartData.length * 38) - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.count)])
    .nice()
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(chartData.map(d => d.neighborhood))
    .range([0, height])
    .padding(0.2);

  // Gridlines
  g.append("g")
    .call(d3.axisBottom(xScale).ticks(6).tickSize(height).tickFormat(""))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(6));

  // Y axis
  g.append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("font-size", "11px");

  // Color scale
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([chartData.length, 0]);

  // Bars
  g.selectAll(".bar")
    .data(chartData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.neighborhood))
    .attr("width", d => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("fill", (_, i) => colorScale(i))
    .attr("stroke", d => d.neighborhood === appState.selections.neighborhoodFilter ? "#ef4444" : "none")
    .attr("stroke-width", d => d.neighborhood === appState.selections.neighborhoodFilter ? 3 : 0)
    .attr("stroke-dasharray", d => d.neighborhood === appState.selections.neighborhoodFilter ? "6,3" : "none")
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      // Toggle neighborhood filter for linked interaction
      if (appState.selections.neighborhoodFilter === d.neighborhood) {
        appState.selections.neighborhoodFilter = "";
      } else {
        appState.selections.neighborhoodFilter = d.neighborhood;
      }
      syncControlsFromState();
      renderDashboard();
    })
    .on("mouseover", (event, d) => {
      showTooltip(event, `
        <strong>${d.neighborhood}</strong><br/>
        Reports: ${d.count}
      `);
    })
    .on("mouseout", hideTooltip);

  // Labels
  g.selectAll(".bar-label")
    .data(chartData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.count) + 6)
    .attr("y", d => yScale(d.neighborhood) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .style("font-size", "11px")
    .style("fill", "#374151")
    .text(d => d.count >= 1000 ? `${(d.count / 1000).toFixed(1)}k` : d.count);

  // Axis label
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#6b7280")
    .text("Number of Reports");
}

function renderDeptChart(data) {
  const container = d3.select("#department-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const counts = d3.rollup(data, v => v.length, d => d.deptName || "NA");
  const chartData = Array.from(counts, ([dept, count]) => ({ dept, count }))
    .filter(d => d.dept !== "NA")
    .sort((a, b) => b.count - a.count);

  const margin = { top: 20, right: 100, bottom: 50, left: 210 };
  const containerRect = container.node().getBoundingClientRect();
  const width  = containerRect.width - margin.left - margin.right;
  const height = Math.max(300, chartData.length * 38) - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.count)])
    .nice()
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(chartData.map(d => d.dept))
    .range([0, height])
    .padding(0.2);

  // gridlines
  g.append("g")
    .call(d3.axisBottom(xScale).ticks(6).tickSize(height).tickFormat(""))
    .attr("transform", `translate(0,0)`)
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d));

  g.append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("font-size", "11px");

  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([chartData.length, 0]);

  g.selectAll(".bar")
    .data(chartData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.dept))
    .attr("width", d => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("fill", (_, i) => colorScale(i))
    .attr("stroke", d => appState.selectedDepartments.includes(d.dept) ? "#ef4444" : "none")
    .attr("stroke-width", d => appState.selectedDepartments.includes(d.dept) ? 3 : 0)
    .attr("stroke-dasharray", d => appState.selectedDepartments.includes(d.dept) ? "6,3" : "none")
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      toggleArraySelection(appState.selectedDepartments, d.dept);
      renderDashboard();
    })
    .on("mouseover", (event, d) => {
      const pct = ((d.count / data.length) * 100).toFixed(1);
      showTooltip(event, `
        <strong>${d.dept}</strong><br/>
        Reports: ${d.count.toLocaleString()}<br/>
        Share: ${pct}%<br/>
        <em>Click to filter</em>
      `);
    })
    .on("mouseout", hideTooltip);

  g.selectAll(".bar-label")
    .data(chartData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.count) + 6)
    .attr("y", d => yScale(d.dept) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .style("font-size", "11px")
    .style("fill", "#374151")
    .text(d => d.count >= 1000 ? `${(d.count / 1000).toFixed(1)}k` : d.count);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#6b7280")
    .text("Number of Reports");
}

function renderStatusChart(data) {
  const container = d3.select("#status-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width;
  const height = 400;
  const radius = Math.min(width, height) / 2 - 40;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${width/2}, ${height/2})`);

  // Group by status
  const statusCounts = d3.rollup(data, v => v.length, d => d.status);
  const pieData = Array.from(statusCounts, ([status, count]) => ({
    status: status,
    count: count
  }));

  // Color scale
  const colorScale = d3.scaleOrdinal()
    .domain(pieData.map(d => d.status))
    .range(d3.schemeSet3);

  // Pie layout
  const pie = d3.pie()
    .value(d => d.count)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  // Create pie slices
  const arcs = g.selectAll(".arc")
    .data(pie(pieData))
    .join("g")
    .attr("class", "arc");

  arcs.append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.status))
    .attr("stroke", d => d.data.status === appState.selections.statusFilter ? "#ef4444" : "white")
    .attr("stroke-width", d => d.data.status === appState.selections.statusFilter ? 3 : 2)
    .attr("stroke-dasharray", d => d.data.status === appState.selections.statusFilter ? "6,3" : "none")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      // Toggle status filter for linked interaction
      if (appState.selections.statusFilter === d.data.status) {
        appState.selections.statusFilter = "";
      } else {
        appState.selections.statusFilter = d.data.status;
      }
      syncControlsFromState();
      renderDashboard();
    })
    .on("mouseover", (event, d) => {
      showTooltip(event, `
        <strong>${d.data.status}</strong><br/>
        Count: ${d.data.count}<br/>
        Percentage: ${((d.data.count / data.length) * 100).toFixed(1)}%
      `);
    })
    .on("mouseout", hideTooltip);

  // Add labels
  arcs.append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .text(d => d.data.status)
    .style("font-size", "10px");
}

function renderPriorityChart(data) {
  const container = d3.select("#priority-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const counts = d3.rollup(data, v => v.length, d => d.priority || "NA");
  const chartData = Array.from(counts, ([priority, count]) => ({ priority, count }))
    .filter(d => d.priority !== "NA")
    .sort((a, b) => b.count - a.count);

  const margin = { top: 20, right: 100, bottom: 50, left: 210 };
  const containerRect = container.node().getBoundingClientRect();
  const width  = containerRect.width - margin.left - margin.right;
  const height = Math.max(300, chartData.length * 38) - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.count)])
    .nice()
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(chartData.map(d => d.priority))
    .range([0, height])
    .padding(0.2);

  // gridlines
  g.append("g")
    .call(d3.axisBottom(xScale).ticks(6).tickSize(height).tickFormat(""))
    .attr("transform", `translate(0,0)`)
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d));

  g.append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("font-size", "11px");

  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([chartData.length, 0]);

  g.selectAll(".bar")
    .data(chartData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.priority))
    .attr("width", d => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("fill", (_, i) => colorScale(i))
    .attr("stroke", d => appState.selectedPriorities.includes(d.priority) ? "#ef4444" : "none")
    .attr("stroke-width", d => appState.selectedPriorities.includes(d.priority) ? 3 : 0)
    .attr("stroke-dasharray", d => appState.selectedPriorities.includes(d.priority) ? "6,3" : "none")
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      toggleArraySelection(appState.selectedPriorities, d.priority);
      renderDashboard();
    })
    .on("mouseover", (event, d) => {
      const pct = ((d.count / data.length) * 100).toFixed(1);
      showTooltip(event, `
        <strong>${d.priority}</strong><br/>
        Reports: ${d.count.toLocaleString()}<br/>
        Share: ${pct}%<br/>
        <em>Click to filter</em>
      `);
    })
    .on("mouseout", hideTooltip);

  g.selectAll(".bar-label")
    .data(chartData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.count) + 6)
    .attr("y", d => yScale(d.priority) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .style("font-size", "11px")
    .style("fill", "#374151")
    .text(d => d.count >= 1000 ? `${(d.count / 1000).toFixed(1)}k` : d.count);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#6b7280")
    .text("Number of Reports");
}

function renderMethodChart(data) {
  const container = d3.select("#method-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const counts = d3.rollup(data, v => v.length, d => d.method || "NA");
  const chartData = Array.from(counts, ([method, count]) => ({ method, count }))
    .filter(d => d.method !== "NA")
    .sort((a, b) => b.count - a.count);

  const margin = { top: 20, right: 100, bottom: 50, left: 210 };
  const containerRect = container.node().getBoundingClientRect();
  const width  = containerRect.width - margin.left - margin.right;
  const height = Math.max(300, chartData.length * 38) - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.count)])
    .nice()
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(chartData.map(d => d.method))
    .range([0, height])
    .padding(0.2);

  // gridlines
  g.append("g")
    .call(d3.axisBottom(xScale).ticks(6).tickSize(height).tickFormat(""))
    .attr("transform", `translate(0,0)`)
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d));

  g.append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("font-size", "11px");

  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([chartData.length, 0]);

  g.selectAll(".bar")
    .data(chartData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.method))
    .attr("width", d => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("fill", (_, i) => colorScale(i))
    .attr("stroke", d => appState.selectedMethods.includes(d.method) ? "#ef4444" : "none")
    .attr("stroke-width", d => appState.selectedMethods.includes(d.method) ? 3 : 0)
    .attr("stroke-dasharray", d => appState.selectedMethods.includes(d.method) ? "6,3" : "none")
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      toggleArraySelection(appState.selectedMethods, d.method);
      renderDashboard();
    })
    .on("mouseover", (event, d) => {
      const pct = ((d.count / data.length) * 100).toFixed(1);
      showTooltip(event, `
        <strong>${d.method}</strong><br/>
        Reports: ${d.count.toLocaleString()}<br/>
        Share: ${pct}%<br/>
        <em>Click to filter</em>
      `);
    })
    .on("mouseout", hideTooltip);

  g.selectAll(".bar-label")
    .data(chartData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.count) + 6)
    .attr("y", d => yScale(d.method) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .style("font-size", "11px")
    .style("fill", "#374151")
    .text(d => d.count >= 1000 ? `${(d.count / 1000).toFixed(1)}k` : d.count);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#6b7280")
    .text("Number of Reports");
}

function renderServiceTypeChart(data) {
  const container = d3.select("#serviceType-chart");
  container.selectAll("*").remove();

  // Render color customization controls
  renderServiceTypeColors();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const counts = d3.rollup(data, v => v.length, d => d.serviceType || "NA");
  const chartData = Array.from(counts, ([serviceType, count]) => ({ serviceType, count }))
    .filter(d => d.serviceType !== "NA")
    .sort((a, b) => b.count - a.count);

  const margin = { top: 20, right: 100, bottom: 50, left: 210 };
  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width - margin.left - margin.right;
  const height = Math.max(300, chartData.length * 38) - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.count)])
    .nice()
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(chartData.map(d => d.serviceType))
    .range([0, height])
    .padding(0.2);

  // Gridlines
  g.append("g")
    .call(d3.axisBottom(xScale).ticks(6).tickSize(height).tickFormat(""))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(6));

  // Y axis
  g.append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .style("font-size", "11px");

  // Bars
  g.selectAll(".bar")
    .data(chartData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.serviceType))
    .attr("width", d => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("fill", d => appState.serviceTypeColors[d.serviceType] || "#999999")
    .attr("stroke", d => appState.selectedServiceTypes.includes(d.serviceType) ? "#ef4444" : "none")
    .attr("stroke-width", d => appState.selectedServiceTypes.includes(d.serviceType) ? 3 : 0)
    .attr("stroke-dasharray", d => appState.selectedServiceTypes.includes(d.serviceType) ? "6,3" : "none")
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      toggleArraySelection(appState.selectedServiceTypes, d.serviceType);
      renderDashboard();
    })
    .on("mouseover", (event, d) => {
      const pct = ((d.count / data.length) * 100).toFixed(1);
      showTooltip(event, `
        <strong>${d.serviceType}</strong><br/>
        Reports: ${d.count.toLocaleString()}<br/>
        Share: ${pct}%<br/>
        <em>Click to filter</em>
      `);
    })
    .on("mouseout", hideTooltip);

  // Labels
  g.selectAll(".bar-label")
    .data(chartData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.count) + 6)
    .attr("y", d => yScale(d.serviceType) + yScale.bandwidth() / 2)
    .attr("dy", "0.35em")
    .style("font-size", "11px")
    .style("fill", "#374151")
    .text(d => d.count >= 1000 ? `${(d.count / 1000).toFixed(1)}k` : d.count);

  // Axis label
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#6b7280")
    .text("Number of Reports");
}

function renderServiceTypeColors() {
  const container = d3.select("#service-type-colors");
  container.selectAll("*").remove();

  if (!appState.serviceTypes || appState.serviceTypes.length === 0) return;

  appState.serviceTypes.forEach(type => {
    const itemDiv = container.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "6px")
      .style("padding", "6px")
      .style("background", "#f9fafb")
      .style("border-radius", "4px")
      .style("border", "1px solid #e5e7eb");

    // Color swatch
    itemDiv.append("div")
      .style("width", "16px")
      .style("height", "16px")
      .style("background-color", appState.serviceTypeColors[type])
      .style("border", "1px solid #ccc")
      .style("border-radius", "2px");

    // Label
    itemDiv.append("label")
      .style("flex", "1")
      .style("font-size", "11px")
      .style("white-space", "nowrap")
      .style("overflow", "hidden")
      .style("text-overflow", "ellipsis")
      .text(type.substring(0, 25) + (type.length > 25 ? "..." : ""));

    // Color picker
    itemDiv.append("input")
      .attr("type", "color")
      .attr("value", appState.serviceTypeColors[type])
      .style("width", "30px")
      .style("height", "24px")
      .style("border", "1px solid #ccc")
      .style("cursor", "pointer")
      .on("change", (event) => {
        appState.serviceTypeColors[type] = event.target.value;
        renderDashboard();
      });
  });
}

// map persists so we don't rebuild tiles every tab switch
let mapInstance = null;
let mapMarkerLayers = {};
let mapHeatLayer = null;
let mapViewMode = "points";
let mapValidData = [];

function renderMapChart(data) {
  const container = document.getElementById("map");
  if (!container) return;

  if (typeof L === 'undefined') {
    container.innerHTML = "<p style='padding: 20px; color: orange;'>Loading map library...</p>";
    setTimeout(() => renderMapChart(data), 500);
    return;
  }

  // only keep points inside Cincinnati bounds
  const validData = data.filter(d =>
    d.latitude && d.longitude &&
    !isNaN(d.latitude) && !isNaN(d.longitude) &&
    d.latitude > 39.0 && d.latitude < 39.25 &&
    d.longitude > -84.7 && d.longitude < -84.3
  );

  // create map once, reuse after
  if (!mapInstance) {
    container.innerHTML = "";
    container.style.width = '100%';
    container.style.height = '100%';

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
      setTimeout(() => renderMapChart(data), 100);
      return;
    }

    // center on UC campus
    mapInstance = L.map('map', {
      center: [39.1320, -84.5150],
      zoom: 16,
      preferCanvas: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19, minZoom: 9
    }).addTo(mapInstance);

    // click near a point to see its details
    mapInstance.on('click', function(e) {
      let closest = null, minDist = Infinity;
      mapValidData.forEach(d => {
        const dist = Math.pow(d.latitude - e.latlng.lat, 2) + Math.pow(d.longitude - e.latlng.lng, 2);
        if (dist < minDist) { minDist = dist; closest = d; }
      });
      if (closest && minDist < 0.0001) {
        L.popup()
          .setLatLng([closest.latitude, closest.longitude])
          .setContent(`
            <div style="font-size:12px;max-width:220px;">
              <strong>${closest.serviceType}</strong><br/>
              Status: ${closest.status}<br/>
              Neighborhood: ${closest.neighborhood}<br/>
              Dept: ${closest.deptName}<br/>
              Created: ${d3.timeFormat("%m/%d/%Y")(closest.dateCreated)}
            </div>`)
          .openOn(mapInstance);
      }
    });

    // redraw on pan/zoom
    mapInstance.on('moveend', function() {
      if (mapViewMode === "points") renderViewportMarkers();
      else updateMapStats();
    });
  }

  // wipe old layers before adding new ones
  Object.values(mapMarkerLayers).forEach(lg => mapInstance.removeLayer(lg));
  mapMarkerLayers = {};
  if (mapHeatLayer) { mapInstance.removeLayer(mapHeatLayer); mapHeatLayer = null; }

  if (validData.length === 0) return;

  // toggle heatmap vs points
  const heatBtn = document.getElementById("heatmapToggle");
  const pointsBtn = document.getElementById("pointsToggle");
  heatBtn.classList.toggle("active", mapViewMode === "heatmap");
  pointsBtn.classList.toggle("active", mapViewMode === "points");
  heatBtn.onclick = () => { mapViewMode = "heatmap"; renderMapChart(data); };
  pointsBtn.onclick = () => { mapViewMode = "points"; renderMapChart(data); };

  // save for pan/zoom redraws
  mapValidData = validData;

  if (mapViewMode === "heatmap") {
    // heatmap uses all points
    const heatData = validData.map(d => [d.latitude, d.longitude, 0.5]);
    mapHeatLayer = L.heatLayer(heatData, {
      radius: 18, blur: 15, maxZoom: 17, max: 1,
      gradient: { 0: '#0000ff', 0.25: '#00ff00', 0.5: '#ffff00', 0.75: '#ff7f00', 1: '#ff0000' }
    }).addTo(mapInstance);
  } else {
    // points mode renders only whats in view
    renderViewportMarkers();
  }

  // rebuild controls each render
  if (mapInstance._customControls) {
    mapInstance._customControls.forEach(c => mapInstance.removeControl(c));
  }
  mapInstance._customControls = [];

  // types sorted by frequency
  const typeCounts = d3.rollup(validData, v => v.length, d => d.serviceType);
  const sortedTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  // filter panel
  const filterCtrl = L.control({ position: 'topright' });
  filterCtrl.onAdd = function() {
    const wrapper = L.DomUtil.create('div', '');

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Filter Types';
    toggleBtn.style.cssText = 'background:#fff;border:1px solid #cdd5df;border-radius:4px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.1);display:block;';
    wrapper.appendChild(toggleBtn);

    const panel = document.createElement('div');
    panel.className = 'map-legend';
    panel.style.cssText = 'max-height:45vh;width:240px;display:none;flex-direction:column;margin-top:4px;';

    // all/none links
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-shrink:0;';
    const titleSpan = document.createElement('strong');
    titleSpan.style.fontSize = '12px';
    titleSpan.textContent = 'Service Types';
    header.appendChild(titleSpan);
    const btnGroup = document.createElement('span');
    btnGroup.style.fontSize = '10px';
    const allBtn = document.createElement('a');
    allBtn.textContent = 'All';
    allBtn.href = '#';
    allBtn.style.cssText = 'margin-right:6px;color:#2563eb;';
    allBtn.onclick = (e) => { e.preventDefault(); appState.selectedServiceTypes = []; renderDashboard(); };
    const noneBtn = document.createElement('a');
    noneBtn.textContent = 'None';
    noneBtn.href = '#';
    noneBtn.style.color = '#2563eb';
    noneBtn.onclick = (e) => { e.preventDefault(); appState.selectedServiceTypes = ['__none__']; renderDashboard(); };
    btnGroup.appendChild(allBtn);
    btnGroup.appendChild(noneBtn);
    header.appendChild(btnGroup);
    panel.appendChild(header);

    // type checkboxes
    const list = document.createElement('div');
    list.style.cssText = 'overflow-y:auto;flex:1;';
    sortedTypes.forEach(([type, count]) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:2px 0;font-size:10px;cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.style.cssText = 'margin:0;flex-shrink:0;';
      cb.checked = appState.selectedServiceTypes.length === 0 || appState.selectedServiceTypes.includes(type);
      cb.addEventListener('change', () => {
        if (appState.selectedServiceTypes.length === 0) {
          appState.selectedServiceTypes = appState.serviceTypes.filter(t => t !== type);
        } else {
          toggleArraySelection(appState.selectedServiceTypes, type);
          if (appState.selectedServiceTypes.length === appState.serviceTypes.length) {
            appState.selectedServiceTypes = [];
          }
        }
        renderDashboard();
      });
      const swatch = document.createElement('span');
      swatch.style.cssText = 'width:10px;height:10px;border-radius:2px;flex-shrink:0;background:' + (appState.serviceTypeColors[type] || '#999');
      const lbl = document.createElement('span');
      lbl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      lbl.textContent = type;
      lbl.title = type;
      const badge = document.createElement('span');
      badge.style.cssText = 'color:#999;flex-shrink:0;font-size:9px;';
      badge.textContent = count.toLocaleString();
      row.appendChild(cb);
      row.appendChild(swatch);
      row.appendChild(lbl);
      row.appendChild(badge);
      list.appendChild(row);
    });
    panel.appendChild(list);
    wrapper.appendChild(panel);

    toggleBtn.addEventListener('click', () => {
      const open = panel.style.display === 'flex';
      panel.style.display = open ? 'none' : 'flex';
      toggleBtn.textContent = open ? 'Filter Types' : 'Close Filters';
    });

    L.DomEvent.disableClickPropagation(wrapper);
    L.DomEvent.disableScrollPropagation(wrapper);
    return wrapper;
  };
  filterCtrl.addTo(mapInstance);
  mapInstance._customControls.push(filterCtrl);

  // stats panel
  const statsCtrl = L.control({ position: 'bottomleft' });
  statsCtrl.onAdd = function() {
    const wrapper = L.DomUtil.create('div', '');

    const body = document.createElement('div');
    body.className = 'map-legend';
    body.id = 'map-stats';
    body.style.cssText = 'font-size:11px;min-width:180px;';
    wrapper.appendChild(body);

    const hideBtn = document.createElement('button');
    hideBtn.textContent = 'Hide Stats';
    hideBtn.style.cssText = 'background:#fff;border:1px solid #cdd5df;border-radius:4px;padding:3px 8px;font-size:10px;cursor:pointer;margin-top:4px;box-shadow:0 1px 3px rgba(0,0,0,.1);';
    wrapper.appendChild(hideBtn);

    hideBtn.addEventListener('click', () => {
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      hideBtn.textContent = open ? 'Show Stats' : 'Hide Stats';
    });

    L.DomEvent.disableClickPropagation(wrapper);
    return wrapper;
  };
  statsCtrl.addTo(mapInstance);
  mapInstance._customControls.push(statsCtrl);
  updateMapStats();

  setTimeout(() => mapInstance.invalidateSize(), 50);
}

// draw only markers visible on screen
function renderViewportMarkers() {
  if (!mapInstance || !mapValidData.length) return;

  // clear old point layers
  Object.values(mapMarkerLayers).forEach(lg => mapInstance.removeLayer(lg));
  mapMarkerLayers = {};

  const bounds = mapInstance.getBounds();
  const visible = mapValidData.filter(d =>
    d.latitude >= bounds.getSouth() && d.latitude <= bounds.getNorth() &&
    d.longitude >= bounds.getWest() && d.longitude <= bounds.getEast()
  );

  const byType = d3.group(visible, d => d.serviceType);
  byType.forEach((points, type) => {
    const color = appState.serviceTypeColors[type] || "#999";
    const layer = L.layerGroup();
    points.forEach(d => {
      L.circleMarker([d.latitude, d.longitude], {
        radius: 4, fillColor: color, color: color, weight: 0, fillOpacity: 0.6
      }).addTo(layer);
    });
    layer.addTo(mapInstance);
    mapMarkerLayers[type] = layer;
  });

  updateMapStats();
}

// refresh the stats box
function updateMapStats() {
  const el = document.getElementById('map-stats');
  if (!el || !mapInstance) return;
  el.innerHTML = '';

  const bounds = mapInstance.getBounds();
  const visible = mapValidData.filter(d =>
    d.latitude >= bounds.getSouth() && d.latitude <= bounds.getNorth() &&
    d.longitude >= bounds.getWest() && d.longitude <= bounds.getEast()
  );

  if (visible.length === 0) {
    el.innerHTML = '<strong>No requests in view</strong>';
    return;
  }

  const topTypes = Array.from(d3.rollup(visible, v => v.length, d => d.serviceType).entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const openCount = visible.filter(d => d.status === 'OPEN').length;
  const closedCount = visible.length - openCount;
  const pctClosed = Math.round(closedCount / visible.length * 100);
  const neighborhoods = new Set(visible.map(d => d.neighborhood).filter(Boolean));

  // header
  el.innerHTML = '<strong style="font-size:12px;">Area Stats</strong>'
    + '<div style="margin:4px 0;padding-bottom:4px;border-bottom:1px solid #eee;">'
    + visible.length.toLocaleString() + ' in view'
    + '<span style="color:#888;"> / ' + mapValidData.length.toLocaleString() + '</span></div>';

  // status filter buttons
  const statusRow = document.createElement('div');
  statusRow.style.cssText = 'display:flex;gap:4px;margin:6px 0;';
  ['CLOSED', 'OPEN'].forEach(status => {
    const btn = document.createElement('button');
    const count = status === 'OPEN' ? openCount : closedCount;
    const pct = status === 'CLOSED' ? pctClosed : (100 - pctClosed);
    const active = appState.selections.statusFilter === status;
    const clr = status === 'CLOSED' ? '#059669' : '#dc2626';
    btn.textContent = status + ' ' + pct + '% (' + count.toLocaleString() + ')';
    btn.style.cssText = 'flex:1;border:1px solid ' + (active ? clr : '#cdd5df') + ';border-radius:4px;padding:3px 6px;font-size:10px;cursor:pointer;background:' + (active ? clr + '18' : '#fff') + ';color:' + clr + ';font-weight:' + (active ? '600' : '400') + ';';
    btn.onclick = () => {
      appState.selections.statusFilter = active ? '' : status;
      syncControlsFromState();
      renderDashboard();
    };
    statusRow.appendChild(btn);
  });
  el.appendChild(statusRow);

  // progress bar
  const bar = document.createElement('div');
  bar.style.cssText = 'background:#fee2e2;border-radius:3px;height:5px;overflow:hidden;margin-bottom:6px;';
  bar.innerHTML = '<div style="background:#059669;width:' + pctClosed + '%;height:100%;"></div>';
  el.appendChild(bar);

  // top types (click to filter)
  const typeHeader = document.createElement('div');
  typeHeader.style.cssText = 'font-size:10px;margin-bottom:2px;';
  typeHeader.innerHTML = '<strong>Top types</strong> <span style="color:#888;font-weight:400;">(click to filter)</span>';
  el.appendChild(typeHeader);

  topTypes.forEach(([type, count]) => {
    const color = appState.serviceTypeColors[type] || '#999';
    const active = appState.selectedServiceTypes.includes(type);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:10px;margin:2px 0;padding:2px 4px;border-radius:3px;cursor:pointer;background:' + (active ? color + '18' : 'transparent') + ';border:1px solid ' + (active ? color : 'transparent') + ';';
    row.title = 'Click to toggle ' + type;
    row.innerHTML = '<span style="width:8px;height:8px;border-radius:2px;background:' + color + ';flex-shrink:0;display:inline-block;"></span>'
      + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + type + '</span>'
      + '<span style="color:#888;">' + count.toLocaleString() + '</span>';
    row.onclick = () => {
      // toggle this type in/out of selectedServiceTypes
      if (appState.selectedServiceTypes.length === 0) {
        appState.selectedServiceTypes = [type];
      } else if (active) {
        appState.selectedServiceTypes = appState.selectedServiceTypes.filter(t => t !== type);
        if (appState.selectedServiceTypes.length === 0) appState.selectedServiceTypes = [];
      } else {
        appState.selectedServiceTypes.push(type);
      }
      renderDashboard();
    };
    el.appendChild(row);
  });

  // neighborhoods in view
  const foot = document.createElement('div');
  foot.style.cssText = 'margin-top:6px;font-size:10px;color:#666;border-top:1px solid #eee;padding-top:4px;';
  foot.textContent = neighborhoods.size + ' neighborhood' + (neighborhoods.size !== 1 ? 's' : '') + ' in view';
  el.appendChild(foot);
}

function updatePanelVisibility() {
  d3.selectAll(".panel")
    .classed("is-active", false);

  d3.select(`#panel-${appState.selections.activePanel}`)
    .classed("is-active", true);

  d3.selectAll(".tab-button")
    .classed("is-active", false)
    .attr("aria-selected", "false");

  d3.select(`.tab-button[data-panel="${appState.selections.activePanel}"]`)
    .classed("is-active", true)
    .attr("aria-selected", "true");
}

function syncControlsFromState() {
  d3.select("#statusFilter").property("value", appState.selections.statusFilter);
  d3.select("#neighborhoodFilter").property("value", appState.selections.neighborhoodFilter);
  d3.select("#dateRangeStart").property("value", appState.selections.dateRangeStart);
  d3.select("#dateRangeEnd").property("value", appState.selections.dateRangeEnd);
  d3.select("#addressSearch").property("value", appState.selections.addressQuery);
}

function syncUrlState() {
  const params = new URLSearchParams();
  params.set("tab", appState.selections.activePanel);
  if (appState.selections.statusFilter) params.set("status", appState.selections.statusFilter);
  if (appState.selections.neighborhoodFilter) params.set("neighborhood", appState.selections.neighborhoodFilter);
  if (appState.selections.dateRangeStart !== DEFAULT_SELECTIONS.dateRangeStart) {
    params.set("start", appState.selections.dateRangeStart);
  }
  if (appState.selections.dateRangeEnd !== DEFAULT_SELECTIONS.dateRangeEnd) {
    params.set("end", appState.selections.dateRangeEnd);
  }
  if (appState.selections.addressQuery) params.set("q", appState.selections.addressQuery);

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", nextUrl);
}

// Toggle a value in/out of an array (mutates in place)
function toggleArraySelection(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) {
    arr.push(value);
  } else {
    arr.splice(idx, 1);
  }
}

// Utility functions
function showTooltip(event, content) {
  const tooltip = d3.select("#tooltip");
  tooltip.style("display", "block")
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px")
    .html(content);
}

function hideTooltip() {
  d3.select("#tooltip").style("display", "none");
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Added for heatmap marker interaction
function filterByNeighborhood(neighborhood) {
  appState.selections.neighborhoodFilter = neighborhood;
  syncControlsFromState();
  renderDashboard();
}

function filterByStatus(status) {
  appState.selections.statusFilter = status;
  syncControlsFromState();
  renderDashboard();
}
