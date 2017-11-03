import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import {
    drag,
    event,
    forceX,
    forceY,
    forceCenter,
    forceCollide,
    forceManyBody,
    forceSimulation,
    min,
    max,
    rgb,
    scaleLinear,
    ScaleLinear,
    select,
    Selection,
    Simulation,
    zoom,
    zoomIdentity,
    SimulationNodeDatum
} from 'd3';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [`
  .ng-svg-container { position: relative; height: 100%; width: 100%; }
  .ng-svg-container .node .node-default { fill: black; }
  .ng-svg-container .node .node-text-default { fill: black; font-family: Arial; font-size: 14; }
  .ng-svg-container .link-default { stroke: grey; }
`]
})
export class AppComponent implements OnInit {
    nodes = [];
    @ViewChild('svgcontainer') container: ElementRef;

    protected svg: Selection<SVGElement, any, HTMLElement, any>;
    protected g: Selection<SVGGElement, any, HTMLElement, any>;
    protected radiusScale: ScaleLinear<number, number>;
    protected sim: Simulation<any, undefined>;
    protected nodeContainers: Selection<Element, {}, SVGGElement, any>;
    protected nodesSelection: Selection<SVGCircleElement, {}, SVGGElement, any>;

    private maxNodeRadius = 20;
    private minNodeRadius = 10;
    private maxZoom = 10;
    private minZoom = 0.1;
    private gravityStrength = 0.2;
    private nodeCharge: number = -1000;
    private preGenerate = true;
    private preGenerateFreeze = false;
    private preGenerateMaxTicks = 10000;

    constructor() {
        this.nodes = [
            { id: 0, name: 'Node 1', weight: 20 },
            { id: 1, name: 'Node 2', type: 'unique', weight: 100 },
            { id: 2, name: 'Node 3', weight: 50 },
            { id: 3, name: 'Node 4', weight: 50 },
            { id: 4, name: 'Node 5', weight: 80 }
        ];
    }

    ngOnInit(): void {
        if (this.nodes.length === 0) {
            return;
        }

        const height = this.container.nativeElement.offsetHeight;
        const width = this.container.nativeElement.offsetWidth;
        const domainMax = max(this.nodes, item => item.weight);
        const domainMin = min(this.nodes, item => item.weight);

        this.radiusScale = scaleLinear()
                                        .range([this.minNodeRadius, this.maxNodeRadius])
                                        .domain([domainMin ? domainMin : 0, domainMax ? domainMax : 1]);

        const zoomView = zoom()
              .scaleExtent([this.minZoom, this.maxZoom])
              .on('zoom', () => this.g.attr('transform', event.transform));

        this.svg = select<HTMLDivElement, any>(this.container.nativeElement)
            .append<SVGElement>('svg')
            .attr('height', height)
            .attr('width', width);

        this.g = this.svg.append<SVGGElement>('g');

        this.svg.call(zoomView)
            .style('cursor', 'move')
            .classed('draggable', true);

        this.onConfigureForce(height, width);

        this.onGenerateNodes(height, width);

        this.sim.on('tick', this.onTick.bind(this));
    }

    onTick(): void {
        this.nodeContainers
            .each((d: any) => {
                if (d.fixed && d.fx == null && d.fy == null) {
                    d.fx = d.x;
                    d.fy = d.y;
                }
            })
            .attr('transform', (d: any) => 'translate(' + d.x + ',' + d.y + ')');
    }

    public onConfigureForce(height: number, width: number) {
        this.sim = forceSimulation<any>(this.nodes)
            .force('charge', forceManyBody<any>().strength(this.nodeCharge))
            .force('center', forceCenter<any>(width / 2, height / 2))
            .force('collide', forceCollide<any>((datum, index, groups) => this.radiusScale(datum.weight)))
            .force('x', forceX<any>(width / 2).strength(this.gravityStrength))
            .force('y', forceY<any>(height / 2).strength(this.gravityStrength));

        if (this.preGenerate) {
            let limiter = this.preGenerateMaxTicks;
            while (this.sim.alpha() > 0.001 && limiter--) {
                this.sim.tick();
            }

            if (this.preGenerateFreeze) {
                this.nodes.forEach(node => node.fixed = true);
            }
        }
    }

    public onGenerateNodes(height: number, width: number) {
        const self = this;

        this.nodeContainers = this.g.selectAll('g.node')
            .data(this.sim.nodes())
            .enter()
            .append<SVGGElement>('g')
            .attr('class', 'node');

        this.nodesSelection = this.nodeContainers.append<SVGCircleElement>('circle')
            .attr('r', (datum: any, index, groups) => this.radiusScale(datum.weight))
            .attr('class', (datum: any, index, groups) => `node-${datum.type ? datum.type : 'default'}`);

        const text = this.nodeContainers.append<SVGTextElement>('text')
            .attr('dx', (datum: any, index, groups) => this.radiusScale(datum.weight) + 10)
            .attr('dy', '.35em')
            .text((datum: any, index, groups) => datum.name)
            .attr('class', (datum: any, index, groups) => `node-text-${datum.type ? datum.type : 'default'}`);

        this.nodeContainers.call(
            drag<SVGGElement, any>()
        ).classed('draggable', true);
    }
}
