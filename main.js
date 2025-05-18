
const width = window.innerWidth;
const height = window.innerHeight;


const bigNumber = 100000

const gridGap = 100;
const initialScale = 0.5;
const initialTranslate = [bigNumber / 2, bigNumber / 2];
let svg
let mapData = { lines: [] }
let map
let mode = null


const lineHelper = d3.line().x(d => d.x).y(d => d.y).curve(circleCorners.radius(500))

function start() {
    window.addEventListener("resize", e => {
        svg
            .attr("width", window.innerWidth)
            .attr("height", window.innerHeight)
    })

    const c = d3.select("#map").append("svg")
    svg = d3.select("#map svg")
        .attr("width", width)
        .attr("height", height)
    const g = svg.append("g")
    map = g.append("g").attr("id", "map")


    //  ZOOM/PAN SYSTEM  //////////////////////////////////////////
    const zoom = d3.zoom().scaleExtent([0.1, 6]).on("zoom", zoomed);
    const zoomContainer = svg.call(zoom);

    zoom.scaleTo(zoomContainer, initialScale);
    zoom.translateTo(zoomContainer, initialTranslate[0], initialTranslate[1]);



    //  GRID LINES  ///////////////////////////////////////////////

    const numberOfTicks = { x: bigNumber / gridGap, y: bigNumber / gridGap }

    g.append('g').attr('class', 'vertical-grid');
    g.append('g').attr('class', 'horizontal-grid');

    const xScale = d3.scaleLinear()
        .domain([0, bigNumber])
        .range([0, bigNumber])

    const xGridGenerator = d3.axisBottom(xScale)
        .tickSize(bigNumber)
        .ticks(numberOfTicks.x)

    const xAxis = c
        .select('.vertical-grid')
        .attr('transform', `translate(${0}, ${0})`)
        .call(xGridGenerator)

    const yScale = d3.scaleLinear()
        .domain([0, bigNumber])
        .range([0, bigNumber])

    const yGridGenerator = d3.axisRight(yScale)
        .tickSize(bigNumber)
        .ticks(numberOfTicks.y)

    const yAxis = c
        .select('.horizontal-grid')
        .attr('transform', `translate(${0}, ${0})`)
        .call(yGridGenerator)
    // EDITOR FUNCTIONALITY ///////////////////////////////////////////////////
    const highLightDot = g
        .append("circle")
        .attr("stroke-width", 20)
    svg.on("mousemove", (e) => snapMove(e, highLightDot, g));
    svg.on("click", (e) => {
        switch (mode) {
            case "line":
                if (!mapData.lines[0]) mapData.lines.push({
                    id: 1,
                    points: []
                })
                mapData.lines[0].points.push(snappedMouse(e, g))
                console.log(mapData)
                renderMap()
                break;
            default:
                break;
        }
    })
    $("#addLine").on("click", { data: this }, data => {
        setMode(highLightDot, "line")
        renderMap()
    })
    $("#addStation").on("click", { data: this }, data => {
        setMode(highLightDot, "station")
        renderMap()
    })
    setMode(highLightDot, null)
}

function renderMap() {
    let existingLineIds = []
    $("g#map").children().each((i, l) => {
        existingLineIds.push(l.id)
    })
    const newLines = mapData.lines
    newLines.forEach(l => {
        console.log(existingLineIds.some(id => id == l.id), existingLineIds)
        if (existingLineIds.some(id => id == l.id)) return
        addLine(l)
    })
    map.selectAll("path").each((d, i, n) => {
        if (newLines.some(l => l.id == n[i].id)) {
            //line is still in data, keep
            //update data for path
            map.selectChildren("path").attr("d", lineHelper)
        } else {
            //line no longer in data, delete
            n[i].remove()
        }
    })
}
function addLine(l) {
    map
        .append('path')
        .datum(l.points)
        .attr('d', lineHelper)
        .attr('id', l.id)
        .style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '100')
}

function zoomed(event) {
    svg.select("g").attr("transform", event.transform.toString());
}
function alongSegment(from, toward, distanceAlong) {
    const bearing = Math.atan2(from.y - toward.y, from.x - toward.x);
    return {
        bearing,
        x: from.x - distanceAlong * Math.cos(bearing),
        y: from.y - distanceAlong * Math.sin(bearing)
    };
}
function setMode(obj, m) {
    mode = m
    switch (m) {
        case "line":
            obj
                .attr("r", 50)
                .attr("fill", "black")
                .attr("stroke", "none")
            break;
        case "station":
            obj
                .attr("r", 75)
                .attr("fill", "white")
                .attr("stroke", "black")
            break;
        default:
            obj
                .attr("r", 50)
                .attr("fill", "none")
                .attr("stroke", "none")
            break;
    }
}
function snappedMouse(event, g) {
    const coords = d3.pointer(event, g)
    const transform = d3.zoomTransform(event.target);
    const pos = transform.invert(coords);
    return { x: Math.round(pos[0] / gridGap) * gridGap, y: Math.round(pos[1] / gridGap) * gridGap }
}
function snapMove(event, obj, g) {
    const mouse = snappedMouse(event, g)
    obj.attr("cx", mouse.x).attr("cy", mouse.y);
}

start()