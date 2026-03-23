// Pothole Dashboard Configuration
const CHART_MARGIN = { top: 20, right: 30, bottom: 40, left: 60 };
const PANEL_OPTIONS = ["timeline", "neighborhood", "status", "map"];

const DEFAULT_SELECTIONS = {
  activePanel: "timeline",
  statusFilter: "",
  neighborhoodFilter: "",
  dateRangeStart: "2023-01-01", 
  dateRangeEnd: "2025-09-30",
  addressQuery: ""
};

let appState = null;

console.log('Loading pothole data from:', DATA_CONFIG.potholeData);

// Load and process pothole data
d3.csv(DATA_CONFIG.potholeData)
  .then(data => {
    console.log('Raw data loaded, rows:', data.length);
    // Process and clean the data
    const processedData = data.map(d => ({
      srNumber: d.SR_NUMBER,
      status: d.SR_STATUS,
      statusFlag: d.SR_STATUS_FLAG,
      typeDesc: d.SR_TYPE_DESC,
      address: d.ADDRESS,
      location: d.LOCATION,
      dateCreated: new Date(d.DATE_CREATED),
      plannedEndDate: d.PLANNED_END_DATE ? new Date(d.PLANNED_END_DATE) : null,
      dateClosed: d.DATE_CLOSED ? new Date(d.DATE_CLOSED) : null,
      closedByPlanned: d["Closed by Planned End Date"],
      streetDirection: d.STREET_DIRECTION,
      streetNo: d.STREET_NO,
      streetName: d.STREET_NAME,
      zipcode: d.ZIPCODE,
      numPotholes: +d.NUM_POTHOLES || 0,
      methodReceived: d.METHOD_RECEIVED,
      neighborhood: d.NEIGHBORHOOD,
      snaNeighborhood: d.SNA_NEIGHBORHOOD,
      ccNeighborhood: d.CC_NEIGHBORHOOD,
      latitude: +d.LATITUDE,
      longitude: +d.LONGITUDE,
      xCoord: +d.X_COORD,
      yCoord: +d.Y_COORD
    })).filter(d => d.dateCreated && !isNaN(d.dateCreated.getTime()));

    // Extract unique values for filters
    const neighborhoods = [...new Set(processedData.map(d => d.neighborhood))].sort();
    const statuses = [...new Set(processedData.map(d => d.status))].sort();
    const addresses = [...new Set(processedData.map(d => d.address))].slice(0, 100); // Limit for performance

    console.log('Processed data:', processedData.length, 'records');
    console.log('Sample record:', processedData[0]);
    
    appState = {
      data: processedData,
      neighborhoods: neighborhoods,
      statuses: statuses,
      addresses: addresses,
      selections: { ...DEFAULT_SELECTIONS }
    };
    
    console.log('App state initialized');

    setupFilters();
    bindEvents();
    syncUrlState();
    renderDashboard();

    window.addEventListener("resize", debounce(renderDashboard, 150));
  })
  .catch(error => {
    console.error("Error loading pothole data:", error);
    console.log("Attempting to use sample data for testing...");
    
    // Create sample data for testing when CSV won't load
    const sampleData = [
      {
        srNumber: "SR23000001",
        status: "CLOSED",
        address: "100 MAIN ST",
        neighborhood: "DOWNTOWN",
        dateCreated: new Date("2023-01-15"),
        dateClosed: new Date("2023-01-20"),
        numPotholes: 2,
        latitude: 39.1031,
        longitude: -84.5120
      },
      {
        srNumber: "SR23000002", 
        status: "OPEN",
        address: "200 ELM ST",
        neighborhood: "OTR", 
        dateCreated: new Date("2023-02-10"),
        dateClosed: null,
        numPotholes: 1,
        latitude: 39.1100,
        longitude: -84.5150
      },
      {
        srNumber: "SR23000003",
        status: "CLOSED", 
        address: "300 VINE ST",
        neighborhood: "DOWNTOWN",
        dateCreated: new Date("2023-03-05"),
        dateClosed: new Date("2023-03-12"), 
        numPotholes: 3,
        latitude: 39.1050,
        longitude: -84.5090
      }
    ];
    
    console.log("Using sample data:", sampleData.length, "records");
    
    appState = {
      data: sampleData,
      neighborhoods: ["DOWNTOWN", "OTR"],
      statuses: ["OPEN", "CLOSED"],
      addresses: sampleData.map(d => d.address),
      selections: { ...DEFAULT_SELECTIONS }
    };
    
    setupFilters();
    bindEvents(); 
    renderDashboard();
    
    // Show message to user
    const message = document.createElement('div');
    message.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 6px; z-index: 1000; max-width: 300px; font-size: 12px;';
    message.innerHTML = `
      <strong>Using Sample Data</strong><br/>
      Could not load CSV file. Showing sample data for demonstration.<br/>
      <strong>To fix:</strong> Serve from <a href="http://localhost:8000" target="_blank" style="color: #1d4ed8;">http://localhost:8000</a>
    `;
    document.body.appendChild(message);
    
    setTimeout(() => message.remove(), 10000);
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

function renderDashboard() {
  if (!appState) return;

  updatePanelVisibility();
  
  const filteredData = getFilteredData();

  switch(appState.selections.activePanel) {
    case "timeline":
      renderTimelineChart(filteredData);
      break;
    case "neighborhood":
      renderNeighborhoodChart(filteredData);
      break;
    case "status":
      renderStatusChart(filteredData);
      break;
    case "map":
      renderMapChart(filteredData);
      break;
  }
}

function getFilteredData() {
  let filtered = appState.data;

  // Filter by status
  if (appState.selections.statusFilter) {
    filtered = filtered.filter(d => d.status === appState.selections.statusFilter);
  }

  // Filter by neighborhood  
  if (appState.selections.neighborhoodFilter) {
    filtered = filtered.filter(d => d.neighborhood === appState.selections.neighborhoodFilter);
  }

  // Filter by date range
  const startDate = new Date(appState.selections.dateRangeStart);
  const endDate = new Date(appState.selections.dateRangeEnd);
  filtered = filtered.filter(d => d.dateCreated >= startDate && d.dateCreated <= endDate);

  // Filter by address search
  if (appState.selections.addressQuery) {
    filtered = filtered.filter(d => 
      d.address.toLowerCase().includes(appState.selections.addressQuery)
    );
  }

  return filtered;
}

function renderTimelineChart(data) {
  const container = d3.select("#timeline-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const margin = CHART_MARGIN;
  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Group data by date for timeline
  const dateFormatter = d3.timeFormat("%Y-%m");
  const grouped = d3.rollup(data, 
    v => v.length, 
    d => dateFormatter(d.dateCreated)
  );

  const timelineData = Array.from(grouped, ([date, count]) => ({
    date: d3.timeParse("%Y-%m")(date),
    count: count
  })).sort((a, b) => a.date - b.date);

  // Scales
  const xScale = d3.scaleTime()
    .domain(d3.extent(timelineData, d => d.date))
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(timelineData, d => d.count)])
    .nice()
    .range([height, 0]);

  // Line generator
  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.count))
    .curve(d3.curveMonotoneX);

  // Add axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %Y")));

  g.append("g")
    .call(d3.axisLeft(yScale));

  // Add line
  g.append("path")
    .datum(timelineData)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Add dots
  g.selectAll(".dot")
    .data(timelineData)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.count))
    .attr("r", 4)
    .attr("fill", "#2563eb")
    .on("mouseover", (event, d) => {
      showTooltip(event, `
        <strong>${d3.timeFormat("%B %Y")(d.date)}</strong><br/>
        Pothole Reports: ${d.count}
      `);
    })
    .on("mouseout", hideTooltip);

  // Add labels
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .text("Date");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .text("Number of Reports");
}

function renderNeighborhoodChart(data) {
  const container = d3.select("#neighborhood-chart");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const margin = CHART_MARGIN;
  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  // Group by neighborhood
  const neighborhoodCounts = d3.rollup(data, v => v.length, d => d.neighborhood);
  const chartData = Array.from(neighborhoodCounts, ([neighborhood, count]) => ({
    neighborhood: neighborhood,
    count: count
  })).sort((a, b) => b.count - a.count).slice(0, 15); // Top 15

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const xScale = d3.scaleBand()
    .domain(chartData.map(d => d.neighborhood))
    .range([0, width])
    .padding(0.1);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.count)])
    .nice()
    .range([height, 0]);

  // Add axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  g.append("g")
    .call(d3.axisLeft(yScale));

  // Add bars
  g.selectAll(".bar")
    .data(chartData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.neighborhood))
    .attr("y", d => yScale(d.count))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - yScale(d.count))
    .attr("fill", "#3b82f6")
    .on("mouseover", (event, d) => {
      showTooltip(event, `
        <strong>${d.neighborhood}</strong><br/>
        Reports: ${d.count}
      `);
    })
    .on("mouseout", hideTooltip);

  // Add labels
  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .text("Neighborhood");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
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
    .attr("stroke", "white")
    .attr("stroke-width", 2)
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
    .style("font-size", "12px");
}

function renderMapChart(data) {
  const container = d3.select("#map");
  container.selectAll("*").remove();

  if (data.length === 0) {
    container.append("p").text("No data available for current filters.");
    return;
  }

  const containerRect = container.node().getBoundingClientRect();
  const width = containerRect.width;
  const height = 500;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  // Filter data with valid coordinates
  const validData = data.filter(d => 
    d.latitude && d.longitude && 
    !isNaN(d.latitude) && !isNaN(d.longitude)
  );

  if (validData.length === 0) {
    container.append("p").text("No location data available for current filters.");
    return;
  }

  // Create projection based on data bounds
  const latExtent = d3.extent(validData, d => d.latitude);
  const lonExtent = d3.extent(validData, d => d.longitude);

  const projection = d3.geoMercator()
    .domain([[lonExtent[0], latExtent[0]], [lonExtent[1], latExtent[1]]])
    .fitSize([width - 20, height - 20], {
      type: "Polygon",
      coordinates: [[
        [lonExtent[0], latExtent[0]],
        [lonExtent[0], latExtent[1]],
        [lonExtent[1], latExtent[1]],
        [lonExtent[1], latExtent[0]],
        [lonExtent[0], latExtent[0]]
      ]]
    });

  const g = svg.append("g")
    .attr("transform", "translate(10, 10)");

  // Color scale based on number of potholes
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, d3.max(validData, d => d.numPotholes) || 1]);

  // Add points
  g.selectAll(".pothole-point")
    .data(validData)
    .join("circle")
    .attr("class", "pothole-point")
    .attr("cx", d => projection([d.longitude, d.latitude])[0])
    .attr("cy", d => projection([d.longitude, d.latitude])[1])
    .attr("r", d => Math.max(3, Math.sqrt(d.numPotholes + 1) * 2))
    .attr("fill", d => colorScale(d.numPotholes))
    .attr("opacity", 0.7)
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .on("mouseover", (event, d) => {
      showTooltip(event, `
        <strong>${d.address}</strong><br/>
        Status: ${d.status}<br/>
        Neighborhood: ${d.neighborhood}<br/>
        Potholes: ${d.numPotholes}<br/>
        Created: ${d3.timeFormat("%m/%d/%Y")(d.dateCreated)}
      `);
    })
    .on("mouseout", hideTooltip);

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .on("zoom", (event) => {
      g.attr("transform", `translate(10, 10) ${event.transform}`);
    });

  svg.call(zoom);
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
