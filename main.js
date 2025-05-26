
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

const stopStyle = {
    radius: 1,
    size: 300,
    fill: "white",
    stroke: "black",
    strokeWidth: 50,
}

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


const lineHelper = (r = 500) => {
    return d3.line().x(d => idToNode(d).x).y(d => idToNode(d).y).curve(circleCorners.radius(r))
}
const XYLineHelper = r => {
    return d3.line().x(d => d.x).y(d => d.y).curve(circleCorners.radius(r))
}

const basicLineHelper = d3.line().x(d => d.x).y(d => d.y)

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
                d3.select(this).attr('stroke-width', '3');
            }
            if (d % (gridGap * 20) === 0) {
                d3.select(this).attr('stroke-width', '5');
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
                        id: "id_1",
                        name: "testLine",
                        color: "blue",
                        nodes: []
                    })
                    selectedLine = "id_1"
                }
                const pos = snappedMouse(e, g)


                const index = idToLine(selectedLine).nodes.findIndex(n => idToNode(n).active)

                console.log(index, idToLine(selectedLine).nodes.filter(n => idToNode(n).y == pos.y && idToNode(n).x == pos.x))

                
                if (idToLine(selectedLine).nodes.some(n => idToNode(n).y == pos.y && idToNode(n).x == pos.x)) {
                    Object.values(mapData.nodes).forEach(n => n.active = false)
                    idToLine(selectedLine).nodes.filter(n => idToNode(n).y == pos.y && idToNode(n).x == pos.x).forEach(n => idToNode(n).active = true)
                    renderMap()
                } else if (pointSegment(idToLine(selectedLine), pos).length) {
                    Object.values(mapData.nodes).forEach(n => n.active = false)
                    const matches = pointSegment(idToLine(selectedLine), pos)
                    console.log(matches)
                    matches.forEach(i => {
                        console.log(i, idToNode(idToLine(selectedLine).nodes[i])) 
                        idToNode(idToLine(selectedLine).nodes[i]).active = true
                        idToNode(idToLine(selectedLine).nodes[i+1]).active = true
                    })
                    renderMap()

                } else if (index >= 0 || idToLine(selectedLine).nodes.length == 0) {
                    Object.values(mapData.nodes).forEach(n => n.active = false)
                    if (mode == "line") {
                        const node = new Node(pos.x, pos.y)
                        mapData.nodes[node.id] = node
                        idToLine(selectedLine).nodes.splice(index, 0, node.id)
                    }
                    renderMap()
                }
                break;
            case "station":
                const mouse = snappedMouse(e, g)
                const directMatches = Object.values(mapData.nodes).filter(n => n.x == mouse.x && n.y == mouse.y)
                if (directMatches.length) {
                    directMatches.forEach(m => {
                        mapData.nodes[m.id] = Stop.convertFromNode(m, "TEST_CONVERTED")
                    })
                } else {
                    const segmentMatches = mapData.lines.map(l => ({ indexes: pointSegment(l, mouse), line: l }))
                    const newStop = new Stop(mouse.x, mouse.y, "TEST_GENERATED")
                    mapData.nodes[newStop.id] = newStop
                    segmentMatches.forEach(m => {
                        m.indexes.forEach(i => {
                            m.line.nodes.splice(i, 0, newStop.id)
                        })
                    })
                }

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
    $("#save").on("click", { data: this }, data => {
        save()
    })
    $("#load").on("click", { data: this }, data => {
        load()
    })
    $("#clear").on("click", { data: this }, data => {
        clear()
    })
    document.addEventListener("keydown", e => {
        if (e.ctrlKey) switch (e.code) {
            case "KeyS":
                save()
                e.preventDefault()
                break;
            case "KeyI":
                load()
                e.preventDefault()
                break;
            case "KeyC":
                clear()
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
function updateUI() {
    const lineContainer = document.getElementById("linesContainer")
    const stationContainer = document.getElementById("stationContainer")

    lineContainer.innerHTML = ""
    stationContainer.innerHTML = ""

    mapData.lines.forEach(l => {
        lineContainer.innerHTML +=
            `<li>
                        <div class="card p-2">
                            <div class="content">
                                <nav class="level mb-0">
                                    <div class="level-left">
                                        <div class="level-item"><span class="color-circle" style="background: ${l.color}"></span></div>
                                        <div class="level-item"><strong>${l.name}</strong></div>
                                    </div>
                                    <div class="level-right">
                                        <div class="level-item"><small>${l.id}</small></div>
                                    </div>
                                </nav>

                                <br>
                                <p>Progress</p>
                                <div class="progress-wrapper">
                                    <progress class="progress" value="15" max="100">15%</progress>
                                    <p class="progress-value has-text-black">15%</p>
                                </div>
                            </div>
                            <nav class="level is-mobile">
                                <div class="level-left">
                                    <div class="level-item p-1">
                                        <span class="icon is-small"><i class="bi bi-pencil"></i></span>
                                    </div>
                                    <div class="level-item p-1">
                                        <span class="icon is-small"><i class="bi bi-eye"></i></span>
                                    </div>
                                </div>
                            </nav>
                        </div>
                    </li>`

        Object.values(mapData.nodes).filter(n => n.type == "stop").forEach(s => {
            const lines = mapData.lines.filter(l => l.nodes.some(n => n == s.id))
            console.log(lines)
            let lineData = ""
            lines.forEach(l => {
                lineData +=
                    `<div class="dropdown-content">
                        <nav class="level mb-0 dropdown-item">
                            <div class="level-left">
                                <div class="level-item"><span class="color-circle" style="background: ${l.color}"></span></div>
                                <div class="level-item"><strong>${l.name}</strong></div>
                            </div>
                            <div class="level-right">
                                <div class="level-item"><small>${l.id}</small></div>
                            </div>
                        </nav>
                    </div>`
            })
            stationContainer.innerHTML +=
                `<li>
                    <div class="card p-2">
                        <div class="content">
                            <nav class="level mb-0">
                                <div class="level-left">
                                    <div class="level-item"><strong>${s.name}</strong></div>
                                </div>
                                <div class="level-right">
                                    <div class="level-item"><small>${s.id}</small></div>
                                </div>
                            </nav>
                            <br>
                            <div class="dropdown">
                                <div class="dropdown-trigger">
                                    <button class="button" aria-haspopup="true" aria-controls="dropdown-menu">
                                        <span>Lines (${lines.length})</span>
                                        <span class="icon is-small">
                                            <i class="bi bi-caret-down-fill" aria-hidden="true"></i>
                                        </span>
                                    </button>
                                </div>
                                <div class="dropdown-menu" id="dropdown-menu" role="menu">
                                    ${lineData}
                                </div>
                            </div>
                        </div>
                        <nav class="level is-mobile">
                            <div class="level-left">
                                <div class="level-item p-1">
                                    <span class="icon is-small"><i class="bi bi-pencil"></i></span>
                                </div>
                                <div class="level-item p-1">
                                    <span class="icon is-small"><i class="bi bi-eye"></i></span>
                                </div>
                            </div>
                        </nav>
                    </div>
                </li>`
        })
    })
    for (let i = 0; i < stationContainer.children.length; i++) {
        const child = stationContainer.children.item(i);
        console.log(child)
        var dropdown = child.querySelector('.dropdown');
        dropdown.addEventListener('click', function (event) {
            event.stopPropagation();
            dropdown.classList.toggle('is-active');
        });
    }
}
function renderMap() {
    updateUI()
    let existingLineIds = []
    let existingNodeIds = []
    $("g#map").children().each((i, l) => {
        switch (l.getAttribute("data-type")) {
            case "node":
                existingNodeIds.push(l.id)
                break;
            case "line":
                existingLineIds.push(l.id)
                break;
            default:
                break;
        }
    })
    console.log($("g#map").children())
    const newLines = mapData.lines
    //adding lines
    newLines.forEach(l => {
        if (existingLineIds.some(id => id == l.id)) return
        addLine(l)
    })
    // updating and deleting lines
    map.selectAll("path[data-type=line]").each((d, i, n) => {
        if (newLines.some(l => l.id == n[i].id)) {
            //line is still in data, keep
            //update data for path
            map.selectChildren("path[data-type=line]").attr("d", lineHelper())
        } else {
            //line no longer in data, delete
            n[i].remove()
        }
    })

    const newNodes = Object.values(mapData.nodes)
    //adding nodes
    newNodes.forEach(n => {
        console.log("e")
        if (existingNodeIds.some(id => id == n.id) || n.type != "stop") return
        addStop(n)
    })
    // updating and deleting nodes
    map.selectAll("path[data-type=node]").each((d, i, n) => {
        if (newNodes.some(l => l.id == n[i].id)) {
            //node is still in data, keep
            //update data for path
            map.selectChildren("path[data-type=node]").attr("d", XYLineHelper(stopStyle.radius * stopStyle.size / 2))
        } else {
            //node no longer in data, delete
            n[i].remove()
        }
    })

    // render nodes on selected line
    if (selectedLine) renderNodes(idToLine(selectedLine))
    else renderNodes({ nodes: [] })
}
function renderNodes(line) {
    clearNodeLines()
    const color = "green"
    for (let i = 0; i < line.nodes.length; i++) {
        const curr = idToNode(line.nodes[i])
        const prev = idToNode(line.nodes[i - 1])
        const fill = curr.active ? "yellow" : curr.fill
        addNode({ x: curr.x, y: curr.y, color: color, fill: fill })

        if (!prev) continue
        addNodeLine({ color: color, line: [curr, prev] })
    }
}
function addStop(s) {
    const radius = stopStyle.radius * stopStyle.size / 2
    const nodes = [
        { x: s.x, y: s.y - radius },
        { x: s.x + radius, y: s.y - radius },
        { x: s.x + radius, y: s.y + radius },
        { x: s.x - radius, y: s.y + radius },
        { x: s.x - radius, y: s.y - radius },
        { x: s.x, y: s.y - radius },
    ]
    map
        .append('path')
        .datum(nodes)
        .attr('d', XYLineHelper(radius))
        .attr('id', s.id)
        .attr('data-type', "node")
        .style('fill', 'white')
        .style('stroke', 'black')
        .style('stroke-width', '50')
}
function idToNode(id) {
    return mapData.nodes[id]
}
function idToLine(id) {
    return mapData.lines.find(l => l.id == id)
}
function activeNode() {
    return idToNode(idToLine(selectedLine) ? idToLine(selectedLine).nodes.find(n => idToNode(n).active == true) : null)
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
function clear() {
    mapData = {
        lines: [],
        nodes: {}
    }
    selectedLine = null
    renderMap()
}
function addLine(l) {
    map
        .append('path')
        .datum(l.nodes)
        .attr('d', lineHelper())
        .attr('id', l.id)
        .attr('data-type', "line")
        .style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '100')
}
function addSnapLine(snapLines) {
    snapLines.forEach(snapLine => {
        snapLineContainer
            .append('path')
            .datum(snapLine.line)
            .attr('d', basicLineHelper)
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
        .attr('d', basicLineHelper)
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
    if (mode == "line" || mode == "station" || (mode == "move" && pressed == 2)) {
        snappers.forEach(snap => {
            const lastNode = activeNode()
            const result = snap.function(mouse, lastNode, idToLine(selectedLine))
            if (result) addSnapLine(result)
        })
    }
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

function isPointOnLineSegment(a, b, c) {
    //line [a,b] point c
    return distance(a, c) + distance(b, c) == distance(a, b);
}
function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}
function pointSegment(line, point) {
    let matches = []
    for (let i = 1; i < line.nodes.length; i++) {
        const curr = idToNode(line.nodes[i])
        const prev = idToNode(line.nodes[i - 1])
        if (isPointOnLineSegment(curr, prev, point)) matches.push(i - 1)
    }
    return matches
}

start()
load()