Destinations = new Meteor.Collection("destinations");

Foodtemples = new Meteor.Collection("foodtemples");

objSize = function (obj) {
    return $.map(obj,function (n, i) {
        return i;
    }).length
};

if (Meteor.isClient) {

    Template.main.isLoggedIn = function () {
        return Cookie.get("loggedInName") !== null;
    };

    Template.main.events({
        'keyup input[name=user]': function (event, template) {
            var value = template.find('input[name=user]').value;
            if (value !== undefined && event.which === 13) {
                Cookie.set("loggedInName", value, {years: 1});
            }
        }
    });

    Template.main.currentUser = function () {
        return Cookie.get("loggedInName");
    };

    Template.enter.events({
        'click input[type=button]': function (event, template) {
            var movement = template.find('select[name=movement]').value;
            var dest = template.find('select[name=addDest]').value;
            var seats = template.find('input[name=freeSeats]').value;
            if (movement == 'fährt') {
                seats = -1;
            }
            var time = template.find('input[name=time]').value;

            Destinations.insert({name: Cookie.get("loggedInName"), movement: movement, dest: dest, seats: seats, joiners: [], time: time});
        },
        'change select[name=movement]': function (event, template) {
            if (event.target.value == 'fährt') {
                $('#seats').removeClass('invisible');
            } else {
                $('#seats').addClass('invisible');
            }
        }
    });

    Template.list.destinations = function () {
        return Destinations.find();
    };


    Template.enter.foodtemples = function () {
        return Foodtemples.find();
    };

    Template.enter.loggedInUser = function () {
        return Cookie.get("loggedInName");
    };

    Template.locations.foodtemples = Template.enter.foodtemples;
    Template.locations.events({
        'click input[type=button]': function (event, template) {
            var value = template.find('input[name=location]').value;
            var link = template.find('input[name=link]').value;
            Foodtemples.insert({name: value, link: link});
            template.find('input[type=location]').value = '';
            template.find('input[type=link]').value = '';
        },
        'click span.delete': function (event, template) {
            Foodtemples.remove(event.target.id);
        },
        'click span.addLocation': function (event, template) {
            $('div.locations').toggleClass("invisible");
        }
    });

    Template.destination.events({
        'click span.delete': function (event, template) {
            if (confirm("Eintrag wirklich löschen?")) {
                Destinations.remove(event.target.id);
            }
        },
        'click span.removejoiner': function (event, template) {
            var id = event.target.getAttribute('itemid');
            var entry = Destinations.findOne(id);
            joiners = entry.joiners;
            joiners = jQuery.grep(joiners, function (value) {
                return value != event.target.getAttribute('name');
            });
            Destinations.update(id, {$set: {joiners: joiners}});
            Session.set("joined", false)
        },
        'click input[type=button]': function (event, template) {
            var id = event.target.name;
            var name = Cookie.get("loggedInName");
            Destinations.update(id, {$push: {joiners: name}});
            Session.set("joined", true);
        }
    });

    Template.destination.movementIs = function (mvmt) {
        return mvmt == this.movement;
    };
    Template.destination.hasJoiners = function (mvmt) {
        return this.joiners.length > 0;
    };

    Template.destination.isJoiner = function (joiner) {
        return joiner == Cookie.get("loggedInName");
    };
    Template.destination.joinerMovementType = function () {
        return (this.movement == 'fährt') ? 'fahren' : 'kommen';
    };
    Template.destination.freeSeats = function (mvmt) {
        return this.seats - this.joiners.length;
    };

    Template.destination.hasSpaceLeftAndCanJoin = function () {
        return (this.seats == -1 || (this.seats - this.joiners.length)) > 0 && Session.get("joined") != true;
    };


    Template.locations.formatlink = function (link) {
        return (link.match("^http://") ? link : "http://" + link);
    };

}

if (Meteor.isServer) {
    Meteor.startup(function () {
        cleanup = function () {
            Destinations.find().forEach(function (post) {
                Destinations.remove(post._id)
            });
        };
        new Meteor.Cron({
            events: {
                "0 0 * * *": function () {
                    Destinations.find().forEach(function (post) {
                        Destinations.remove(post._id)
                    });
                }
            }
        });

        if (Foodtemples.find().count() === 0) {
            var names = ["McDonalds",
                "Marktkauf",
                "Burger King",
                "Credo",
                "Dornier Museum",
                "Forum", "Bahnschrankenthai", "Bodenseecenter-Döner", "XXXLutz", "La Scala"];
            var links = ["mcdonalds.de", "marktkauf.de", "burgerking.de", "credo-ristorante.de", "dorniermuseum.de", "www.forum-restaurant.de", "", "", "xxxlutz.de", "www.pizzeria-la-scala.de"];
            for (var i = 0; i < names.length; i++)
                Foodtemples.insert({name: names[i], link: links[i]});
        }

    });
}
