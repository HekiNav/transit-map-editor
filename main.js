
const width = window.innerWidth;
const height = window.innerHeight;


const bigNumber = 100000

const gridGap = 100;
const initialScale = 0.5;
const initialTranslate = [bigNumber / 2, bigNumber / 2];

let svg
let mapData = { lines: [] }
let map
let snapLineContainer
let mode = null

let lastNode = null
let selectedLine = null

const snappers = [
    /* ADDING A NEW SNAPPER
    // Copy from here =>
    {
        id: "string", //some descriptive id
        function: (pos, prev, path) => { //pos: mouse position, prev: last placed node, path: selected line

            //ADD CHECKS HERE

            // if matches, return array: 
            //  [
            //      {
            //          color: "CSScolor", 
            //          line: [
            //              {x: num, y: num}, //any amount of positions
            //          ]
            //      }, // any amount of matches
            //  ]
            // if no matches, return null
        }
    },
    // <= To here
     */
    {
        id: "otherNodes",
        function: (pos, prev, path) => {
            if (!pos || !path) return null
            const color = "red"
            let paths = []
            path.points.forEach(n => {
                // horizontal
                if (pos.y == n.y ||
                    // vertical
                    pos.x == n.x ||
                    // diagonal 1
                    pos.x - pos.y == n.x - n.y ||
                    // diagonal 2
                    pos.x + pos.y == n.x + n.y
                ) paths.push({ color: color, line: [{ x: pos.x, y: pos.y }, { x: n.x, y: n.y }] })
            })
            return paths.length ? paths : null
        }
    },
    {
        id: "previousNode",
        function: (pos, prev, path) => {
            if (!pos || !prev) return null
            const color = "blue"
            // horizontal
            if (pos.y == prev.y ||
                // vertical
                pos.x == prev.x ||
                // diagonal 1
                pos.x - pos.y == prev.x - prev.y ||
                // diagonal 2
                pos.x + pos.y == prev.x + prev.y
            ) return [{ color: color, line: [{ x: pos.x, y: pos.y }, { x: prev.x, y: prev.y }] }]
            else return null
        }
    }
]


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
    snapLineContainer = g.append("g").attr("id", "snapLines")


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
                if (!mapData.lines[0]) {
                    mapData.lines.push({
                        id: 1,
                        points: []
                    })
                    selectedLine = 1
                }
                const pos = snappedMouse(e, g)
                mapData.lines[0].points.push(pos)
                lastNode = pos
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
    //adding lines
    newLines.forEach(l => {
        console.log(existingLineIds.some(id => id == l.id), existingLineIds)
        if (existingLineIds.some(id => id == l.id)) return 
        addLine(l)
    })
    // updating and deleting lines
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
function addSnapLine(snapLines) {
    snapLines.forEach(snapLine => {
        console.log(snapLine)
        snapLineContainer
            .append('path')
            .datum(snapLine.line)
            .attr('d', lineHelper)
            .style('fill', 'none')
            .style('stroke', snapLine.color)
            .style('stroke-width', '20')
    })
}
function clearSnapLines() {
    snapLineContainer.selectChildren("*").each((d, i, n) => n[i].remove())
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
    clearSnapLines()
    snappers.forEach(snap => {
        const result = snap.function(mouse, lastNode, mapData.lines.find(l => l.id == selectedLine))
        console.log(result)
        if (result) addSnapLine(result)
    })
    obj.attr("cx", mouse.x).attr("cy", mouse.y);
}

start()