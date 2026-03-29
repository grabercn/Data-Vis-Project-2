// Pothole Dashboard Configuration
const CHART_MARGIN = { top: 20, right: 30, bottom: 40, left: 60 };
const PANEL_OPTIONS = ["timeline", "neighborhood", "department", "status", "map", "priority", "method"];

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
/*d3.csv(DATA_CONFIG.potholeData)
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

d3.csv(DATA_CONFIG.potholeData2)
  .then(data => {
    console.log('Raw data loaded, rows:', data.length);
    // Process and clean the data
    const processedData = data.map(d => ({
      srNumber: d.SR_NUMBER,
      userId: d.USER_ID,
      srType: d.SR_TYPE,
      srTypeDesc: d.SR_TYPE_DESC,
      priority: d.PRIORITY,
      deptName: d.DEPT_NAME,
      methodReceived: d.METHOD_RECEIVED,
      neighborhood: d.NEIGHBORHOOD,
      timeReceived: d.TIME_RECEIVED,
      dateCreated: new Date(d.DATE_CREATED),
      plannedCompletionDays: +d.PLANNED_COMPLETION_DAYS || 0,
      dateClosed: d.DATE_CLOSED ? new Date(d.DATE_CLOSED) : null
    })).filter(d => d.dateCreated && !isNaN(d.dateCreated.getTime()));

    // Extract unique values for filters
    const neighborhoods = [...new Set(processedData.map(d => d.neighborhood))].sort();
    

    console.log('Processed data:', processedData.length, 'records');
    console.log('Sample record:', processedData[0]);
    
    appState = {
    data: originalData,        // first dataset
    deptData: processedData,   // second dataset
    neighborhoods,
    statuses,
    addresses,
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
  });*/
Promise.all([
  d3.csv(DATA_CONFIG.potholeData),
  d3.csv(DATA_CONFIG.potholeData2)
]).then(([data1, data2]) => {

  // ✅ FIRST DATASET (original)
  const processedData1 = data1.map(d => ({
    srNumber: d.SR_NUMBER,
    status: d.SR_STATUS,
    address: d.ADDRESS,
    neighborhood: d.NEIGHBORHOOD,
    dateCreated: new Date(d.DATE_CREATED),
    numPotholes: +d.NUM_POTHOLES || 0,
    latitude: +d.LATITUDE,
    longitude: +d.LONGITUDE
  })).filter(d => d.dateCreated && !isNaN(d.dateCreated));

  // ✅ SECOND DATASET (dept)
  const processedData2 = data2.map(d => ({
    deptName: d.DEPT_NAME,
    priority: d.PRIORITY,
    method: d.METHOD_RECEIVED,
    neighborhoods: d.NEIGHBORHOOD,
    dateCreated: new Date(d.DATE_CREATED)
  })).filter(d => d.dateCreated && !isNaN(d.dateCreated));

  // ✅ Filters ONLY from dataset 1
  const neighborhoods = [...new Set(processedData1.map(d => d.neighborhood))].sort();
  const statuses = [...new Set(processedData1.map(d => d.status))].sort();
  const addresses = [...new Set(processedData1.map(d => d.address))].slice(0, 100);

  // ✅ SINGLE appState (correct)
  appState = {
    data: processedData1,
    deptData: processedData2,
    neighborhoods,
    statuses,
    addresses,
    selections: { ...DEFAULT_SELECTIONS }
  };

  console.log("Both datasets loaded");

  setupFilters();
  bindEvents();
  syncUrlState();
  renderDashboard();

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
    case "department":
      renderDeptChart();
      break;
    case "priority":
      renderPriorityChart();
      break;
    case "method":
      renderMethodChart();
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

  // ✅ Group data
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
    .attr("stroke", d => d.neighborhood === appState.selections.neighborhoodFilter ? "#1f2937" : "none")
    .attr("stroke-width", 2)
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

function renderDeptChart() {
  
  let data = appState.deptData;
  // Neighborhood filter
  if (appState.selections.neighborhoodFilter) {
    data = data.filter(d => d.neighborhoods === appState.selections.neighborhoodFilter);
  }

  // Date filter
  const startDate = new Date(appState.selections.dateRangeStart);
  const endDate = new Date(appState.selections.dateRangeEnd);

  data = data.filter(d => 
    d.dateCreated >= startDate && d.dateCreated <= endDate
  );

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
 
  // sequential blue scale — darkest = busiest department
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
    .attr("rx", 3)
    .on("mouseover", (event, d) => {
      const pct = ((d.count / data.length) * 100).toFixed(1);
      showTooltip(event, `
        <strong>${d.dept}</strong><br/>
        Reports: ${d.count.toLocaleString()}<br/>
        Share: ${pct}%
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
    .attr("stroke", d => d.data.status === appState.selections.statusFilter ? "#1f2937" : "white")
    .attr("stroke-width", d => d.data.status === appState.selections.statusFilter ? 3 : 2)
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

function renderPriorityChart() {
  let data = appState.deptData;
  // Neighborhood filter
  if (appState.selections.neighborhoodFilter) {
    data = data.filter(d => d.neighborhoods === appState.selections.neighborhoodFilter);
  }

  // Date filter
  const startDate = new Date(appState.selections.dateRangeStart);
  const endDate = new Date(appState.selections.dateRangeEnd);

  data = data.filter(d => 
    d.dateCreated >= startDate && d.dateCreated <= endDate
  );

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
 
  // sequential blue scale — darkest = busiest department
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
    .attr("rx", 3)
    .on("mouseover", (event, d) => {
      const pct = ((d.count / data.length) * 100).toFixed(1);
      showTooltip(event, `
        <strong>${d.priority}</strong><br/>
        Reports: ${d.count.toLocaleString()}<br/>
        Share: ${pct}%
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

function renderMethodChart() {
 let data = appState.deptData;
  // Neighborhood filter
  if (appState.selections.neighborhoodFilter) {
    data = data.filter(d => d.neighborhoods === appState.selections.neighborhoodFilter);
  }

  // Date filter
  const startDate = new Date(appState.selections.dateRangeStart);
  const endDate = new Date(appState.selections.dateRangeEnd);

  data = data.filter(d => 
    d.dateCreated >= startDate && d.dateCreated <= endDate
  );

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
 
  // sequential blue scale — darkest = busiest department
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
    .attr("rx", 3)
    .on("mouseover", (event, d) => {
      const pct = ((d.count / data.length) * 100).toFixed(1);
      showTooltip(event, `
        <strong>${d.method}</strong><br/>
        Reports: ${d.count.toLocaleString()}<br/>
        Share: ${pct}%
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

// Global map instance for interaction
let mapInstance = null;
let heatmapLayerGroup = null;

function renderMapChart(data) {
  const container = document.getElementById("map");
  
  if (!container) {
    console.error("Map container not found");
    return;
  }

  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error("Leaflet library not loaded. Waiting...");
    container.innerHTML = "<p style='padding: 20px; color: orange;'>Loading map library...</p>";
    setTimeout(() => renderMapChart(data), 500);
    return;
  }

  // Clear existing map if present
  if (mapInstance) {
    try {
      mapInstance.off();
      mapInstance.remove();
      mapInstance = null;
    } catch (e) {
      console.warn("Error clearing previous map:", e);
    }
  }

  // Clear container content
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<p style='padding: 20px;'>No data available for current filters.</p>";
    return;
  }

  // Filter data with valid coordinates
  const validData = data.filter(d => 
    d.latitude && d.longitude && 
    !isNaN(d.latitude) && !isNaN(d.longitude)
  );

  if (validData.length === 0) {
    container.innerHTML = "<p style='padding: 20px;'>No location data available for current filters.</p>";
    return;
  }

  // Calculate center and zoom based on data bounds
  const latExtent = d3.extent(validData, d => d.latitude);
  const lonExtent = d3.extent(validData, d => d.longitude);
  
  const centerLat = (latExtent[0] + latExtent[1]) / 2;
  const centerLon = (lonExtent[0] + lonExtent[1]) / 2;
  
  // Get container dimensions
  const containerRect = container.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  if (width === 0 || height === 0) {
    console.warn("Map container has no dimensions, deferring initialization");
    setTimeout(() => renderMapChart(data), 100);
    return;
  }

  // Initialize Leaflet map with explicit dimensions
  try {
    // Ensure container is properly sized
    container.style.width = '100%';
    container.style.height = '100%';
    
    mapInstance = L.map('map', {
      center: [centerLat, centerLon],
      zoom: 12,
      dragging: true,
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: false
    });

    // Add base tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 9
    }).addTo(mapInstance);

    // Prepare heatmap data: [lat, lon, intensity]
    // Aggregate potholes count by location for intensity
    const heatmapData = validData.map(d => [
      d.latitude,
      d.longitude,
      Math.min(d.numPotholes / 5, 1) // Normalize intensity (0-1), using number of potholes
    ]);

    // Create and add heatmap layer
    const heatmapLayer = L.heatLayer(heatmapData, {
      radius: 30,
      blur: 25,
      maxZoom: 18,
      max: 1,
      gradient: {
        0.0: '#0000ff',
        0.25: '#00ff00',
        0.5: '#ffff00',
        0.75: '#ff7f00',
        1.0: '#ff0000'
      }
    }).addTo(mapInstance);

    // Add markers with popup/tooltip on top of heatmap for individual data inspection
    validData.forEach((d, idx) => {
      const marker = L.circleMarker([d.latitude, d.longitude], {
        radius: Math.min(5 + Math.sqrt(d.numPotholes), 15),
        fillColor: '#2563eb',
        color: '#1e40af',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.2
      }).addTo(mapInstance);

      // Add popup on click for detailed info
      marker.bindPopup(`
        <div style="font-size: 12px; max-width: 200px;">
          <strong>${d.address}</strong><br/>
          Status: ${d.status}<br/>
          Neighborhood: ${d.neighborhood}<br/>
          Potholes: ${d.numPotholes}<br/>
          Created: ${d3.timeFormat("%m/%d/%Y")(d.dateCreated)}
        </div>
      `);

      // Add hover effects
      marker.on('mouseover', function() {
        this.setStyle({ opacity: 0.7, fillOpacity: 0.5 });
      });

      marker.on('mouseout', function() {
        this.setStyle({ opacity: 0.3, fillOpacity: 0.2 });
      });
    });

    // Add legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function(map) {
      const div = L.DomUtil.create('div', 'heatmap-legend');
      div.innerHTML = `
        <strong style="display: block; margin-bottom: 6px;">Heatmap Intensity</strong>
        <div class="heatmap-legend-item">
          <div class="heatmap-legend-color" style="background-color: #0000ff;"></div>
          <span>Low</span>
        </div>
        <div class="heatmap-legend-item">
          <div class="heatmap-legend-color" style="background-color: #ffff00;"></div>
          <span>Medium</span>
        </div>
        <div class="heatmap-legend-item">
          <div class="heatmap-legend-color" style="background-color: #ff0000;"></div>
          <span>High</span>
        </div>
        <div style="font-size: 11px; margin-top: 8px; color: #666;">
          Data Points: ${validData.length}
        </div>
      `;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    legend.addTo(mapInstance);

    // Store reference for linked interactions
    appState.mapData = validData;
    appState.mapInstance = mapInstance;
    appState.heatmapLayer = heatmapLayer;

    // Fit map bounds to data
    const bounds = L.latLngBounds(validData.map(d => [d.latitude, d.longitude]));
    mapInstance.fitBounds(bounds, { padding: [50, 50] });

    // Invalidate map size to ensure proper rendering
    mapInstance.invalidateSize();

  } catch (error) {
    console.error("Error initializing map:", error);
    console.error("Error details:", error.message, error.stack);
    console.log("Leaflet available:", typeof L !== 'undefined');
    console.log("Container:", container);
    container.innerHTML = `<p style='padding: 20px; color: red;'><strong>Error loading map:</strong> ${error.message}</p>`;
  }
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
