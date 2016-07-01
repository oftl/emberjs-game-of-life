import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType
});

Router.map (function() {
    this.route ('coin', { path: '/coin' });
    this.route ('gol',  { path: '/gol' });
    this.route ('toi',  { path: '/toi' });
});

export default Router;
