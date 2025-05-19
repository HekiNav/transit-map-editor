
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
let nodeLineContainer
let mode = null

let selected


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

const zoom = d3.zoom().scaleExtent([0.1, 6]).on("zoom", zoomed);

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
    nodeLineContainer = g.append("g").attr("id", "nodeLines")


    //  ZOOM/PAN SYSTEM  //////////////////////////////////////////

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
    })
    $("#addStation").on("click", { data: this }, data => {
        setMode(highLightDot, "station")
    })
    $("#move").on("click", { data: this }, data => {
        setMode(highLightDot, "move")
    })
    document.addEventListener("keydown", e => {
        switch (e.code) {
            case "KeyM":
                setMode(highLightDot, "move")
                break;
            case "KeyS":
                setMode(highLightDot, "station")
                break;
            case "KeyL":
                setMode(highLightDot, "line")
                break;
            default:
                console.log(e.code)
                break;
        }
    })
    setMode(highLightDot, "move")
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
    // render nodes on selected line
    renderNodes(mapData.lines.find(l => l.id == selectedLine))

}
function renderNodes(line) {
    clearNodeLines()
    const color = "green"
    for (let i = 0; i < line.points.length; i++) {
        const curr = line.points[i];
        const prev = line.points[i - 1];
        addNode({ x: curr.x, y: curr.y, color: color, fill: curr.fill })
        if (!prev) continue
        addNodeLine({ color: color, line: [curr, prev] })
    }
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
        snapLineContainer
            .append('path')
            .datum(snapLine.line)
            .attr('d', lineHelper)
            .style('fill', 'none')
            .style('stroke', snapLine.color)
            .style('stroke-width', '10')
    })
}
function addNode(node) {
    const size = 40
    nodeLineContainer
        .append('rect')
        .attr('x', node.x - size / 2)
        .attr('y', node.y - size / 2)
        .attr('width', size)
        .attr('height', size)
        .style('fill', node.fill || "none")
        .style('stroke', node.color)
        .style('stroke-width', '10')
}
function addNodeLine(nodeLine) {
    nodeLineContainer
        .append('path')
        .datum(nodeLine.line)
        .attr('d', lineHelper)
        .style('fill', 'none')
        .style('stroke', nodeLine.color)
        .style('stroke-width', '10')
}
function clearNodeLines() {
    nodeLineContainer.selectChildren("*").each((d, i, n) => n[i].remove())
}
function clearSnapLines() {
    snapLineContainer.selectChildren("*").each((d, i, n) => n[i].remove())
}

function zoomed(event) {
    if (selected) return
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
            console.log("e")
            document.querySelector("svg").style.cursor = "url('img/addLine.png'),auto"
            break;
        case "station":
            obj
                .attr("r", 75)
                .attr("fill", "white")
                .attr("stroke", "black")
            document.querySelector("svg").style.cursor = "url('img/addStation.png'),auto"
            break;
        default:
            obj
                .attr("r", 50)
                .attr("fill", "none")
                .attr("stroke", "none")
            document.querySelector("svg").style.cursor = "move"
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
    const pressed = event.buttons
    event.preventDefault()
    const mouse = snappedMouse(event, g)
    clearSnapLines()
    if (mode == "line" || mode == "station") {
        snappers.forEach(snap => {
            const result = snap.function(mouse, lastNode, mapData.lines.find(l => l.id == selectedLine))
            console.log(result)
            if (result) addSnapLine(result)
        })
    } else if (mode == "move" && selectedLine) {
        if (selected) {
            mapData.lines.find(l => l.id == selectedLine).points.forEach(p => {
                if (!p.selected) return
                p.x = mouse.x
                p.y = mouse.y
                renderMap()
            })
        }
        const sel = mapData.lines.find(l => l.id == selectedLine)
        selected = false
        mapData.lines.find(l => l.id == selectedLine).points.forEach(p => p.selected = false)
        const nodes = sel.points.map((p,i) => {
            if (p.x == mouse.x && p.y == mouse.y && pressed == 2) {
                p.fill = "blue"
                mapData.lines.find(l => l.id == selectedLine).points[i].selected = true
                selected = true
            } else {
                p.fill = null
            }
            return p
        })
        renderNodes({ id: sel.id, points: nodes })
        console.log(nodes)
    }
    obj.attr("cx", mouse.x).attr("cy", mouse.y);
    if (!selected) {
        svg.call(zoom);
    } else {
        svg.on('.zoom', null);
    }
}

start()