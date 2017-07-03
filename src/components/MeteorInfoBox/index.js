import React from 'react';
import './styles.css';

const styles = {
  backgroundColor: 'rgba(0,0,0,.8)',
  color: '#fff',
  padding: '16px'
}

const MeteorInfoBox = function MeteorInfoBox (props) {
  if (props.meteor && props.meteor.properties) {
    return (
      <div className='container'>
        <div className='meteor-info--container text-center'>
          <h3>{props.meteor.properties.name}</h3>
          <p><strong>Class:</strong> {props.meteor.properties.recclass}</p>
          <p><strong>Mass:</strong> {props.meteor.properties.mass}</p>
          <p><strong>Time:</strong> {props.meteor.properties.year}</p>
          <p><strong>Long:</strong> {props.meteor.properties.reclong}</p>
          <p><strong>Lat:</strong> {props.meteor.properties.reclat}</p>
        </div>
      </div>
    )
  }
  return null;
}

export default MeteorInfoBox;
