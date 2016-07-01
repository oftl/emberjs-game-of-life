import Ember from 'ember';

// implemented B3/S23
// also interesting: B36/S23
//
// wrap the universe around at the borders
//
// see: http://pmav.eu/stuff/javascript-game-of-life-v3.1.1
// (also very interesting: the links at the bottom!)
//

// TODO
//
// zoom
// round cells
// grid, toggleable
//
// hand-made seed
// import seed
//
// multiple colours, players
// extended rules for creation of cells
// basically: move tick() to server and let gms.gol present it
//
// (configurable ?) drop gliders and such that are moving away from alive-list
//
// improve tick
//  cells that didn't change last tick and whose neighbours didn't change won't change this tick
//
// sort alive-list ? for not needing to draw even further away cells it could help.
//

export default Ember.Component.extend ({

    init() {
        this._super();

        this.set ('name',       'Game of Life');

        this.set ('interval',   150);
        this.set ('debug',      false);
        this.set ('drawing',    true);
        this.set ('running',    false);

        this.set ('alive', {});     // check out Ember.Map
        this.set ('neigh', {});     // check out Ember.Map
        this.set ('birth', []);
        this.set ('kill', []);
        this.set ('gen_no', 0);

        // canvas_* and cell_* represent physical values
        //

        this.set ('canvas_width',  600);
        this.set ('canvas_height', 600);
        this.set ('cell_x',        3);
        this.set ('cell_y',        3);
        this.set ('cell_r',        2.5);

        // viewport holds logical values
        //
//        this.set ('vp', Ember.computed (
//            'canvas_width',
//            'canvas_height',
//            'cell_x',
//            'cell_y',
//            function () {
//                return {
//                    x: 0,
//                    y: 0,
//                    w: Math.floor (this.get ('canvas_width')  / this.get ('cell_x')),
//                    h: Math.floor (this.get ('canvas_height') / this.get ('cell_y'))
//                };
//            }
//        ));

        this.setProperties ({
            vp_x: 0,
            vp_y: 0,
            vp_w: Ember.computed (
                'canvas_width',
                'cell_x',
                function () {
                    return Math.floor (this.get ('canvas_width')  / this.get ('cell_x'));
                }
            ),
            vp_h: Ember.computed (
                'canvas_height',
                'cell_y',
                function () {
                    return Math.floor (this.get ('canvas_height')  / this.get ('cell_y'));
                }
            ),
            gen_no      : 0,
            alive_cnt   : 0,
            birthed_cnt : 0,
            killed_cnt  : 0,
            outside_vp  : 0,
            tick_time   : 0,
            gen_time    : 0,

            dbg_alive_len : 0,
            dbg_neigh_len : 0,

            tick_epoch : new Date().getTime()
        });
    },

//    valueObserver: Ember.observer ('interval', function () {
//        Ember.Logger.debug ('interval changed');
//    }),

    actions: {
        go () {
            this.set ('running', true);
            this.go ();
        },
        pause () {
            this.set ('running', false);
            this.pause ();
        },
        step () {
            this.set ('running', false);
            this.step ();
        },
        faster () {
            if (this.get ('interval') >=  50) {
                this.decrementProperty ('interval', 50);
                this.pause();
                this.go();
            }
        },
        slower () {
            this.incrementProperty ('interval', 50);
            this.pause();
            this.go();
        },

        // viewport
        vp_mv_north () {
            this.decrementProperty ('vp_y', 10);
            this.refresh();
        },
        vp_mv_south () {
            this.incrementProperty ('vp_y', 10);
            this.refresh();
        },
        vp_mv_west  () {
            this.decrementProperty ('vp_x', 10);
            this.refresh();
        },
        vp_mv_east  () {
            this.incrementProperty ('vp_x', 10);
            this.refresh();
        },

        vp_grow  () {
            this.incrementProperty ('canvas_width', 25);
            this.incrementProperty ('canvas_height', 25);
            this.refresh();
        },
        vp_shrink  () {
            this.decrementProperty ('canvas_width', 25);
            this.decrementProperty ('canvas_height', 25);
            this.refresh();
        },

        zoom_in () {
            this.incrementProperty ('cell_x', 1);
            this.incrementProperty ('cell_y', 1);
            this.refresh();
        },
        zoom_out () {
            if (this.get ('cell_x') > 1 && this.get ('cell_y') > 1) {
                this.decrementProperty ('cell_x', 1);
                this.decrementProperty ('cell_y', 1);
                this.refresh();
            }
        },

        // misc settings
        debug ()  { this.toggleProperty ('debug'); },
        drawin () { this.toggleProperty ('drawing'); },
    },

    step () {
        this.pause ();
        this.tick ();
        this.draw ();
    },

    pause () {
        if (this.get ('interval_id')) {
            clearInterval (this.get ('interval_id'));
        }
    },

    go () {
        this.set (
            'interval_id',
            setInterval (function () {
                var gen_epoch = new Date().getTime();

                this.incrementProperty ('gen_no');
                this.tick ();
                this.draw ();

                this.set ('gen_time', new Date().getTime() - gen_epoch);
            }.bind (this), this.get ('interval'))
        );
    },


    refresh() {
        if (!this.running) {
            this.draw();
        }
    },

    draw() {
        var ctx = this.get ('ctx');

        if (!this.get ('drawing')) { return; }

        ctx.clearRect (0, 0, this.get ('canvas_width'), this.get ('canvas_height'));

        var inside_viewport = function (params) {
            var x  = params.x,
                y  = params.y,
                vp = params.vp;

            if (
                x >= vp.x          &&
                x <= vp.x + vp.w   &&
                y >= vp.y          &&
                y <= vp.y + vp.h
            )
            {
                return true;
            }
        };

        var outside_vp = 0;
        Object.keys (this.get ('alive')).forEach (function (k) {
            var foo = k.split ('_'),
                x   = foo[0],     // universe-coordinate
                y   = foo[1],     // universe-coordinate
                vp  = {
                    x : this.get ('vp_x'),
                    y : this.get ('vp_y'),
                    w : this.get ('vp_w'),
                    h : this.get ('vp_h')
                };

            if (!inside_viewport ({ x: x, y: y, vp: vp })) {
                outside_vp++;
                return;
            }

            ctx.fillRect (
                (x - this.get ('vp_x')) * this.get ('cell_x'),
                (y - this.get ('vp_y')) * this.get ('cell_y'),
                this.get ('cell_x'),
                this.get ('cell_y')
            );
        }.bind (this));

        this.set ('outside_vp', outside_vp);
    },

    setupUi() {
        var canvas = document.getElementById ('universe');

        this.set ('canvas', canvas);
        this.set ('ctx', canvas.getContext ('2d'));
        this.get ('ctx').fillStyle = "black";
        this.get ('ctx').strokeStyle = "black";
    },

    didInsertElement() {
        this.setupUi();
        this.seed ({
            oscillator_p2     : false,
            blinker_p2        : false,
            gliders           : false,
            gosper_glider_gun : false,
            acorn             : false,

            random            : true
        });

        this.draw();
    },

    tick() {
        var checked = {};  // [2]
        var started = new Date().getTime();

        // take a look at all alive cells [1]
        //
        Object.keys (this.get ('alive')).forEach (function (key) {
            var foo = key.split ('_');
            var x = foo[0],
                y = foo[1];

            var n = this.get ('neigh')[key];

            // any alive cell with less than 2 or more than 3 neighs dies
            // otherwise it (exactly 2 or 3 neighs) it lives on
            //
            if (n < 2 || n > 3) {
                this.get ('kill').push (key);
            }

            this.mapOverNeigh ({
                x: x,
                y: y,
                key: key,
                callback: function (params) {
                    if (this.get ('alive')[params.key] || checked[params.key]) { return; }
                    checked[params.key] = true;

                    // any dead cell with exactly 3 alive neighs is reborn
                    //
                    // NTS
                    // since such a dead cell needs alive neighs it is sufficent
                    // to only check an alive cells neighs here
                    //
                    if (this.get ('neigh')[params.key] === 3) {
                        this.get ('birth').push (params.key);
                    }
                }.bind (this),
            });
        }.bind (this));

        this.do_birth();
        this.do_kill();

        var now = new Date().getTime();

        this.set ('tick_time', now - started);
        this.set ('total_time', Math.floor ((now - this.get ('tick_epoch')) / 1000));
        this.set ('alive_cnt', Object.keys (this.get ('alive')).length);
        this.set ('dbg_alive_len', Object.keys (this.get ('alive')).length);
        this.set ('dbg_neigh_len', Object.keys (this.get ('neigh')).length);
        this.set ('dbg_alive_by_neigh', (this.get ('dbg_alive_len') / this.get ('dbg_neigh_len')).toPrecision (4));
    },

    seed (params) {
        // jump-start the universe with various patterns or random cells
        //

        if (params.oscillator_p2) {
            this.get ('birth').push ('5_5');
            this.get ('birth').push ('5_6');
            this.get ('birth').push ('5_7');
            this.get ('birth').push ('4_6');

            this.get ('birth').push ('15_15');
            this.get ('birth').push ('15_16');
            this.get ('birth').push ('15_17');
            this.get ('birth').push ('14_16');

            this.get ('birth').push ('5_25');
            this.get ('birth').push ('5_26');
            this.get ('birth').push ('5_27');
            this.get ('birth').push ('4_26');
        }
        if (params.blinker_p2) {
            this.get ('birth').push ('35_25');
            this.get ('birth').push ('35_26');
            this.get ('birth').push ('35_27');
        }
        if (params.gliders) {
            this.get ('birth').push ('31_30');
            this.get ('birth').push ('32_31');
            this.get ('birth').push ('30_30');
            this.get ('birth').push ('30_31');
            this.get ('birth').push ('30_32');

            this.get ('birth').push ('51_50');
            this.get ('birth').push ('52_51');
            this.get ('birth').push ('50_50');
            this.get ('birth').push ('50_51');
            this.get ('birth').push ('50_52');
        }
        if (params.gosper_glider_gun) {
            this.get ('birth').push ('2_6');
            this.get ('birth').push ('3_6');
            this.get ('birth').push ('2_7');
            this.get ('birth').push ('3_7');
            this.get ('birth').push ('12_6');
            this.get ('birth').push ('12_7');
            this.get ('birth').push ('12_8');
            this.get ('birth').push ('13_5');
            this.get ('birth').push ('13_9');
            this.get ('birth').push ('14_4');
            this.get ('birth').push ('14_10');
            this.get ('birth').push ('15_4');
            this.get ('birth').push ('15_10');
            this.get ('birth').push ('16_7');
            this.get ('birth').push ('17_5');
            this.get ('birth').push ('17_9');
            this.get ('birth').push ('18_6');
            this.get ('birth').push ('18_7');
            this.get ('birth').push ('18_8');
            this.get ('birth').push ('19_7');

            this.get ('birth').push ('22_4');
            this.get ('birth').push ('22_5');
            this.get ('birth').push ('22_6');
            this.get ('birth').push ('23_4');
            this.get ('birth').push ('23_5');
            this.get ('birth').push ('23_6');
            this.get ('birth').push ('24_3');
            this.get ('birth').push ('24_7');
            this.get ('birth').push ('26_2');
            this.get ('birth').push ('26_3');
            this.get ('birth').push ('26_7');
            this.get ('birth').push ('26_8');
            this.get ('birth').push ('36_4');
            this.get ('birth').push ('36_5');
            this.get ('birth').push ('37_4');
            this.get ('birth').push ('37_5');
        }

        if (params.acorn) {
            this.get ('birth').push ('22_24');
            this.get ('birth').push ('23_22');
            this.get ('birth').push ('23_24');
            this.get ('birth').push ('25_23');
            this.get ('birth').push ('26_24');
            this.get ('birth').push ('27_24');
            this.get ('birth').push ('28_24');
        }

        if (params.random) {
            // TODO double-seeding is currently not checked
            // TODO remember calculated configuration for replay
            //

            var w        = this.get ('vp_w'),
                h        = this.get ('vp_h'),
                center   = 0.3,   // populated area in relation to whole plane
                density  = 0.04,  // % of populated area
                randval  = function (dim) { return Math.floor (Math.random() * (dim - 1)); },
                count    = Math.floor (w * h * center * density);

            for (var i = 0; i < count; i++) {
                var x = randval (w * 0.3) + Math.floor (w * center),
                    y = randval (w * 0.3) + Math.floor (h * center),
                    k = x + '_' + y;

                this.get ('birth').push (k);
            }
        }

        this.do_birth();

        this.set ('alive_cnt', Object.keys (this.get ('alive')).length);
    },

    do_birth() {
        // NTS
        // a to-be-birthed cell can not already be alive

        this.get ('birth').forEach (function (key) {
            var foo = key.split ('_');
            var x = foo[0],
                y = foo[1];

            this.get ('alive')[key] = true;

            this.mapOverNeigh ({
                x: x,
                y: y,
                key: key,
                callback: function (params) {
                    if (this.get ('neigh')[params.key]) {
                        this.get ('neigh')[params.key] += 1;
                    }
                    else {
                        this.get ('neigh')[params.key] = 1;
                    }
                }.bind (this),
            });
        }.bind (this));

        this.set ('birthed_cnt', this.get ('birth').length);
        this.set ('birth', []);
    },

    do_kill() {
        this.get ('kill').forEach (function (key) {
            var foo = key.split ('_');
            var x = foo[0],
                y = foo[1];

            // deleting and later re-creating elements is not the optimal way
            // on the plusside: those leaving gliders and the like will not
            // flodd the alive-list
            delete this.get ('alive')[key];

            this.mapOverNeigh ({
                x: x,
                y: y,
                key: key,
                callback: function (params) {
                    // there must be a neigh count
                    // drop it if it is one (and would therefore become zero)
                    // otherwise: we got ourselves a gumboo
                    //
                    // NTS: actually deleting the entry proved to be *very* slow,
                    // letting it stay zero doesn't hurt

                    if (this.get ('neigh')[params.key] >= 1) {
                        this.get ('neigh')[params.key] -= 1;
                    }
                    else {
                        Ember.Logger.debug ('[GUMBOO 001]');
                    }
                }.bind (this),
            });
        }.bind (this));

        this.set ('killed_cnt', this.get ('kill').length);
        this.set ('kill', []);
    },

    mapOverNeigh (params) {
        // map given callback over neighs of cell at coordinates (x,y) with given key
        //
        var x        = params.x,
            y        = params.y,
        //  key      = params.key,
            callback = params.callback;

        for (var x_offset = -1; x_offset <= 1; x_offset++) {
            for (var y_offset = -1; y_offset <= 1; y_offset++) {
                if (x_offset === 0 && y_offset === 0) { continue; }
                    var x_rel = 1 * x + x_offset,
                        y_rel = 1 * y + y_offset;
                    var key_rel = x_rel + '_' + y_rel;

                callback ({
                    x : x_rel,
                    y : y_rel,
                    key : key_rel,
                });
            }
        }
    }
});

