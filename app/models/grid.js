//
// grid
//

export default DS.Model.extend({
    size_x: DS.attr ('integer'),
    size_y: DS.attr ('integer'),
    alive:  DS.hasMany ('cell'),
    // dead:   DS.hasMany ('cell'),

    tick: Ember.computed ('alive', function (alive) {
    })
});
