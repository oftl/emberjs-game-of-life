import Ember from 'ember';

export default Ember.Component.extend({
    init () {
        this._super();

        this.set ('n', 5);
        this.set ('you_won', false);
        this.set ('you_lost', false);
        this.set ('needed_wins', Math.floor (this.get ('n') / 2 + 1));

        this.set ('wins_to_win_game', this.get ('needed_wins'));
        this.set ('wins', 0);
        this.set ('losses', 0);
        this.set ('games_won', 0);
        this.set ('games_lost', 0);

        this.set ('last_guess', undefined);
        this.set ('last_toss', undefined);

        this.set ('heads_this_game', 0);
        this.set ('tails_this_game', 0);
    },

//    needed_wins: function() {
//        Math.floor (this.get ('n') / 2 + 1);
//    }.property ('n'),

    actions: {
        flipIt (guess) {
            var toss = Math.floor ( Math.random() * 2) ? 'heads' : 'tails';

            toss === 'heads'
                ? this.set ('heads_this_game', this.incrementProperty ('heads_this_game'))
                : this.set ('tails_this_game', this.incrementProperty ('tails_this_game'));

            toss === guess
                ? this.set ('wins', this.incrementProperty ('wins'))
                : this.set ('losses', this.incrementProperty ('losses'));

            this.get ('wins')   >= this.get ('needed_wins') && this.set ('you_won', true);
            this.get ('losses') >= this.get ('needed_wins') && this.set ('you_lost', true);

            this.set ('last_guess', guess);
            this.set ('last_toss', toss);

            this.set ('wins_to_win_game', this.get ('needed_wins') - this.get ('wins'));
        },

        reset () {
            this.get ('you_won') && this.incrementProperty ('games_won');
            this.get ('you_lost') && this.incrementProperty ('games_lost');

            this.set ('you_won', false);
            this.set ('you_lost', false);

            this.set ('wins_to_win_game', this.get ('needed_wins'));
            this.set ('wins', 0);
            this.set ('losses', 0);
            this.set ('last_guess', undefined);
            this.set ('last_toss', undefined);

            this.set ('heads_this_game', 0);
            this.set ('tails_this_game', 0);
        },
    },

});
