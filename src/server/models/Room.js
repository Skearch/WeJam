const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  users: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  queue: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  currentlyPlaying: {
    type: DataTypes.JSON,
    defaultValue: null
  }
}, {
  tableName: 'rooms',
  timestamps: true
});

module.exports = Room;