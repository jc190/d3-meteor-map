import React, { Component } from 'react';
import * as topojson from 'topojson-client';
import meteorData from './assets/meteordata.json';
import './GeoMap.css';
import MeteorInfoBox from '../MeteorInfoBox';

const d3 = window.d3;

class GeoMap extends Component {
  constructor (props) {
    super(props);
    this.state = {
      meteor: {}
    };
    this.zoomed = this.zoomed.bind(this);
    this.draw = this.draw.bind(this);
    this.rotate = this.rotate.bind(this);
  }
  componentDidMount () {
    this.transform = { x: 0, y: 0 };
    // Set up canvas
    this.canvas = d3.select('.geo-map');
    this.canvas.attr('width', window.innerWidth);
    this.canvas.attr('height', window.innerHeight);
    this.context = this.canvas.node().getContext('2d');
    this.center = [this.canvas.node().width / 2, this.canvas.node().height / 2];
    this.canvas.call(d3.zoom()
      .scaleExtent([1/2, 4])
      .on('start', () => {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'mousedown') {
          this.mousePOS = [d3.event.sourceEvent.x, d3.event.sourceEvent.y];
        }
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'touchstart') {
          this.mousePOS = [d3.event.sourceEvent.touches[0].screenX, d3.event.sourceEvent.touches[0].screenY];
        }
      })
      .on("zoom", this.zoomed));
    // Get world map feature collection
    d3.json("https://unpkg.com/world-atlas@1/world/110m.json", (error, world) => {
      if (error) throw error;
      // Init
      // Set up all the features / feature collections
      this.world = world;
      this.land = topojson.feature(world, world.objects.countries);
      this.globe = {type: "Sphere"};
      this.meteorDataPoints = {type: "FeatureCollection", features: meteorData.features};
      // Set projection
      this.projection = d3.geoOrthographic()
        .fitSize([this.canvas.node().width, this.canvas.node().height], this.land);
      // Set path object
      this.path = d3.geoPath().projection(this.projection).context(this.context);
      this.path.pointRadius((d, num) => {
        return num;
      });
      // Get center point of globe
      this.centroid = this.path.centroid(this.globe);
      // Handle mousemove
      this.canvas.on('mousemove', () => {
        let fcoord;
        let mouseCoord = d3.mouse(d3.event.currentTarget)
        let filtered = meteorData.features.filter((f) => {
          if (f.geometry && f.properties) {
            fcoord = this.projection(f.geometry.coordinates);
            let mass = f.properties.mass * .00005;
            mass = mass < 2 ? 2 : mass;
            mass = mass > 50 ? 50 : mass;
            const dx = fcoord[0] - mouseCoord[0],
                  dy = fcoord[1] - mouseCoord[1],
                  distance = Math.sqrt(dx * dx + dy * dy),
                  radius = mass;
            if (distance < radius + 1) {
              return true;
            }
            return false;
          }
        }).reduce((acc, f) => {
          if (f) {
            fcoord = this.projection(f.geometry.coordinates);
            const dx = fcoord[0] - mouseCoord[0],
            dy = fcoord[1] - mouseCoord[1],
            distance = Math.sqrt(dx * dx + dy * dy);
            if ((acc && acc.distance && distance < acc.distance) || acc === null) {
              return acc = { f, distance }
            }
          }
          return acc;
        }, null);
        this.draw();
        if (filtered != null) {
          let mass = filtered.f.properties.mass * .00005;
          mass = mass < 2 ? 2 : mass;
          mass = mass > 50 ? 50 : mass;

          this.context.beginPath();
          this.context.fillStyle = 'rgba(256,0,0,.5)';
          this.path(filtered.f, mass);
          this.context.fill();
          this.setState({
            meteor: filtered.f
          })
        } else {
          this.setState({
            meteor: null
          })
        }
      });
      // Draw
      this.draw();
    });
  }
  zoomed () {
    // Get zoom points
    let transform = d3.event.transform,
        point = transform.invert(this.center);
    // Redraw
    this.context.save();
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    // Handle rotation
    if (d3.event.sourceEvent) {
      if (d3.event.sourceEvent.type === 'mousemove') {
        this.rotate(d3.event);
      }
      if (d3.event.sourceEvent.type === 'touchmove') {
        this.rotate(d3.event, true);
      }
    }
    // Handle zoom
    // this.transform = transform.translate(point[0] - this.centroid[0], point[1] - this.centroid[1]);
    // this.scale = d3.event.transform.k;
    this.draw();
    this.context.restore();
  }
  draw () {
    this.context.translate(this.transform.x, this.transform.y);
    this.context.scale(this.scale, this.scale);

    // Draw ocean
    this.context.beginPath();
    this.path(this.globe);
    this.context.fillStyle = '#0077be';
    this.context.fill();

    // Draw countries / land
    this.context.beginPath();
    this.context.strokeStyle = 'dimgrey';
    this.context.fillStyle = 'grey';
    this.path(this.land);
    this.context.fill();
    this.context.stroke();

    // Draw meteor points
    meteorData.features.forEach((f) => {
      // Calc size based on meteor mass
      let mass = f.properties ? f.properties.mass * .00005 : 0;
      mass = mass < 2 ? 2 : mass;
      mass = mass > 50 ? 50 : mass;
      // Render point
      this.context.beginPath();
      this.context.fillStyle = 'rgba(256,256,256,.5)';
      this.path(f, mass);
      this.context.fill();
    });

    // Draw Sphere outline
    this.context.beginPath();
    this.path(this.globe);
    this.context.strokeStyle = 'black';
    this.context.stroke();

  }
  rotate (event, isMobile) {
    // Credit: https://bl.ocks.org/wwymak/dcdd12937bd4643cd9b3
    let sourceX = isMobile ? event.sourceEvent.touches[0].screenX : event.sourceEvent.x,
        sourceY = isMobile ? event.sourceEvent.touches[0].screenY : event.sourceEvent.y;
    let rotation = this.projection.rotate();
    let radius = this.projection.scale();
    let scale = d3.scaleLinear()
        .domain([-1 * radius, radius])
        .range([-90, 90]);
    let degX = scale(sourceX - this.mousePOS[0]),
        degY = scale(sourceY - this.mousePOS[1]);
    rotation[0] += degX;
    rotation[1] -= degY;
    if (rotation[1] > 90)   rotation[1] = 90;
    if (rotation[1] < -90)  rotation[1] = -90;
    if (rotation[0] >= 180) rotation[0] -= 360;
    this.projection.rotate(rotation);
    this.mousePOS = [sourceX, sourceY];
  }
  render () {

    return (
      <div>
        <canvas className='geo-map' />
        <MeteorInfoBox meteor={this.state.meteor} />
      </div>
    );
  }
}

export default GeoMap;
