
const width = window.innerWidth;
const height = window.innerHeight;


const bigNumber = 100000

const gridGap = 100;
const initialScale = 0.5;
const initialTranslate = [bigNumber / 2, bigNumber / 2];

let svg
let mapData = { lines: [], nodes: {} }
let map
let snapLineContainer
let nodeLineContainer
let mode = null

let selected


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
            path.nodes.forEach(n => {
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
            else return [{ color: "yellow", line: [{ x: pos.x, y: pos.y }, { x: prev.x, y: prev.y }] }]
        }
    }
]


const lineHelper = d3.line().x(d => idToNode(d).x).y(d => idToNode(d).y).curve(circleCorners.radius(500))

const XYlineHelper = d3.line().x(d => d.x).y(d => d.y)

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

    c.select('.vertical-grid')
        .selectAll('.tick line')
        .each(function (d) {
            if (d % (gridGap * 5) === 0) {
                d3.select(this).attr('stroke-width', '2');
            }
            if (d % (gridGap * 20) === 0) {
                d3.select(this).attr('stroke-width', '3');
            }
        });

    c.select('.horizontal-grid')
        .selectAll('.tick line')
        .each(function (d) {
            if (d % (gridGap * 5) === 0) {
                d3.select(this).attr('stroke-width', '2');
            }
            if (d % (gridGap * 20) === 0) {
                d3.select(this).attr('stroke-width', '3');
            }
        });
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
                        nodes: []
                    })
                    selectedLine = 1
                }
                const pos = snappedMouse(e, g)

                const node = new Node(pos.x, pos.y)
                idToLine(selectedLine).nodes.forEach(n => idToNode(n).active = false)
                mapData.nodes[node.id] = node
                idToLine(selectedLine).nodes.push(node.id)
                renderMap()
                break;
            case "station":
                const active = hoveringNode()
                if (!active) return
                mapData.nodes[active.id] = Stop.convertFromNode(active, "TEST")
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
    $("#save").on("click", { data: this }, data => {
        save() 
    })
    $("#load").on("click", { data: this }, data => {
        load()
    })
    document.addEventListener("keydown", e => {
        if (e.ctrlKey) switch (e.code) {
            case "KeyS":
                save()
                e.preventDefault()
                break;
            case "KeyL":
                load()
                e.preventDefault()
                break;
            default:
                break;
        } else switch (e.code) {
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
    renderNodes(idToLine(selectedLine))
}
function renderNodes(line) {
    console.log(line)
    clearNodeLines()
    const color = "green"
    for (let i = 0; i < line.nodes.length; i++) {
        const curr = idToNode(line.nodes[i])
        const prev = idToNode(line.nodes[i - 1])
        if (curr.type == "stop") {
        } else {
            addNode({ x: curr.x, y: curr.y, color: color, fill: curr.fill })
        }
        
        if (!prev) continue
        addNodeLine({ color: color, line: [curr, prev] })
    }
}
function addStop(stop) {
    
}
function idToNode(id) {
    return mapData.nodes[id]
}
function idToLine(id) {
    return mapData.lines.find(l => l.id == id)
}
function activeNode() {
    return idToNode(idToLine(selectedLine) ? idToLine(selectedLine).nodes.find(n => idToNode(n).active == true) :  null)
}
function hoveringNode() {
    return idToNode(idToLine(selectedLine) ? idToLine(selectedLine).nodes.find(n => idToNode(n).hovering == true) :  null)
}
function save() {
    localStorage.setItem("editor.saveFile", JSON.stringify(mapData))
}
function load() {
    if (!localStorage.getItem("editor.saveFile")) return
    mapData = JSON.parse(localStorage.getItem("editor.saveFile"))
    selectedLine = mapData.lines[0].id
    renderMap()
}
function addLine(l) {
    map
        .append('path')
        .datum(l.nodes)
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
            .attr('d', XYlineHelper)
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
        .attr('d', XYlineHelper)
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
    const mouse = snappedMouse(event, g)
    clearSnapLines()
    console.log(idToLine(selectedLine))
    if (mode == "line" || mode == "station" || (mode == "move" && pressed == 2)) {
        snappers.forEach(snap => {
            const lastNode = activeNode()
            const result = snap.function(mouse, lastNode, idToLine(selectedLine))
            if (result) addSnapLine(result)
        })
    }
    if (selectedLine) idToLine(selectedLine).nodes.forEach(id => idToNode(id).hovering = (idToNode(id).x == mouse.x && idToNode(id).y == mouse.y))
    if (mode == "move" && selectedLine) {

        if (selected) {
            idToLine(selectedLine).nodes.forEach(id => {
                const p = mapData.nodes[id]
                if (!p.selected) return
                p.x = mouse.x
                p.y = mouse.y
                renderMap()
            })
        }
        const sel = idToLine(selectedLine)
        selected = false
        idToLine(selectedLine).nodes.forEach(id => idToNode(id).selected = false)
        const nodes = sel.nodes.map((id, i) => {
            const p = idToNode(id)
            if (p.x == mouse.x && p.y == mouse.y && pressed == 2) {
                p.fill = "blue"
                idToNode(idToLine(selectedLine).nodes[i]).selected = true
                selected = true
            } else {
                p.fill = null
            }
            return p.id
        })
        renderNodes({ id: sel.id, nodes: nodes })
    }
    obj.attr("cx", mouse.x).attr("cy", mouse.y);
    if (!selected) {
        svg.call(zoom);
    } else {
        svg.on('.zoom', null);
    }
}

start()