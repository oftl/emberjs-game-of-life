export default DS.Model.extend ({
    heads:  DS.attr ('number', { defaultValue() { return 0 } }),
    tails:  DS.attr ('number', { defaultValue() { return 0 } }),
    wins:   DS.attr ('number', { defaultValue() { return 0 } }),

    tosses: Ember.computed (
        'heads', 'tails',
        function() {
            return `${this.get('heads')} + ${this.get('tails')}`;
        },
    ),

    performance: Ember.computed (
        'heads', 'tails',
        function() {
            return `${this.get('wins')} / ${this.get('tosses')} * 100`;
        },
    ),
})
