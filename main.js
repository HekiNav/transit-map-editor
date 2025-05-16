
const width = window.innerWidth;
const height = window.innerHeight;


const bigNumber = 100000

const gridGap = 100;
const initialScale = 0.5;
const initialTranslate = [bigNumber / 2, bigNumber / 2];
let svg

const lineHelper = d3.line().x(d => d.x * gridGap + bigNumber / 2).y(d => d.y * gridGap + bigNumber / 2).curve(circleCorners.radius(1000))

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

    const zoom = d3.zoom().scaleExtent([0.1, 6]).on("zoom", zoomed);
    const zoomContainer = svg.call(zoom);

    zoom.scaleTo(zoomContainer, initialScale);
    zoom.translateTo(zoomContainer, initialTranslate[0], initialTranslate[1]);
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

    $("#addLine").on("click", e => {
        const data = [
            { x: -20, y: -20 },
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 40, y: -20 },
            { x: 60, y: -20 }
        ]
        g
            .append('path')
            .datum(data)
            .attr('d', lineHelper)
            .style('fill', 'none')
            .style('stroke', 'black')
            .style('stroke-width', '100')
        
    })
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

    start()