Destinations = new Mongo.Collection("destinations");

Foodtemples = new Mongo.Collection("foodtemples");

objSize = function(obj) {
  return $.map(obj, function(n, i) {
    return i;
  }).length;
};

if (Meteor.isClient) {
  var options = {
    userClosable: true,
    clickBodyToClose: true,
    timeout: 2000
  };

  moment.locale('de');

  var createDateForToday = function() {
    var date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date.getTime();
  };

  Template.registerHelper('formatDate', function(date) {
    return moment(date).format('HH:mm:ss');
  });

  if (Cookie.get("loggedInName") !== undefined) {
    Session.set("loggedIn", true);
  }

  var login = function(template) {
    var value = template.find('input[name=user]').value;
    if (value !== undefined && value !== "") {
      Cookie.set("loggedInName", value, {
        years: 1
      });
      Cookie.set("userId", new Meteor.Collection.ObjectID()._str, {
        years: 1
      });
      Session.set("loggedIn", true);
    } else {

      Notifications.warn("So nicht.", "Du musst schon erst deinen Namen eingeben!", options);
    }
  };

  Template.main.events({
    'keyup input[name=user]': function(event, template) {
      if (event.which === 13) {
        login(template);
      }
    },
    'click input[type=button]#login': function(event, template) {
      login(template);
    }
  });
  Template.main.helpers({
    isLoggedIn: function() {
      return Session.get("loggedIn");
    },
    currentUser: function() {
      return Cookie.get("loggedInName");
    },
    today: function() {
      return moment().format('DD. MMMM YYYY');
    }
  });

  Template.enter.events({
    'click input[type=button]': function(event, template) {
      var movement = template.find('select[name=movement]').value;
      var dest = template.find('select[name=addDest]').value;
      var seats = template.find('input[name=freeSeats]').value;
      if (movement == 'läuft') {
        seats = -1;
      }
      var time = template.find('input[name=time]').value;
      var userId = Cookie.get("userId");
      var comment = template.find('input[name=comment]');


      Destinations.insert({
        name: Cookie.get("loggedInName"),
        userId: userId,
        comment: comment.value,
        movement: movement,
        dest: dest,
        seats: seats,
        joiners: [],
        time: time,
        messages: [],
        createDate: createDateForToday()
      });
      comment.value = '';
    },
    'change select[name=movement]': function(event, template) {
      if (event.target.value == 'fährt') {
        $('#seats').removeClass('invisible');
      } else {
        $('#seats').addClass('invisible');
      }
    }
  });

  Template.list.helpers({
    destinations: function() {
      return Destinations.find({createDate: createDateForToday()});
    }
  });
  Template.enter.helpers({
    isFree: function() {
      return !hasJoinedYet();
    },
    foodtemples: function() {
      return Foodtemples.find();
    },
    loggedInUser: function() {
      return Cookie.get("loggedInName");
    }
  });


  Template.locations.helpers({
    formatlink: function(link) {
      return (link.match("^http://") ? link : "http://" + link);
    },
    foodtemples: function() {
      return Foodtemples.find();
    },
  });

  Template.messages.helpers({
    hasMessages: function() {
      return this.messages.length > 0;
    }
  });

  Template.locations.events({
    'click input[type=button]': function(event, template) {
      var value = template.find('input[name=location]').value;
      var link = template.find('input[name=link]').value;
      Foodtemples.insert({
        name: value,
        link: link
      });
      template.find('input[type=location]').value = '';
      template.find('input[type=link]').value = '';
    },
    'click span.delete': function(event, template) {
      Foodtemples.remove(event.target.id);
    },
    'click span.addLocation': function(event, template) {
      $('div.locations').toggleClass("invisible");
    }
  });

  Template.destination.events({
    'click span.delete': function(event, template) {
      if (confirm("Eintrag wirklich löschen?")) {
        Destinations.remove(event.target.id);
      }
    },
    'click input[type=button]#leave': function(event, template) {
      var id = event.target.name;
      var entry = Destinations.findOne(id);
      joiners = entry.joiners;
      joiners = jQuery.grep(joiners, function(value) {
        return value.userId != Cookie.get("userId");
      });
      Destinations.update(id, {
        $set: {
          joiners: joiners
        }
      });
    },
    'click input[type=button]#join': function(event, template) {
      var id = event.target.name;
      var name = Cookie.get("loggedInName");
      var userId = Cookie.get("userId");
      Destinations.update(id, {
        $push: {
          joiners: {
            name: name,
            userId: userId
          }
        }
      });
    }
  });
  Template.messages.events({
    'keyup input[name=message]': function(event, template) {
      if (event.which === 13) {
        var button = template.find('input[type=button]');
        $(button).click();
      }
    },
    'click input[type=button]#comment': function(event, template) {
      var id = event.target.name;
      var comment = template.find('input[name=message]').value;

      if (comment !== undefined && comment !== "") {

        template.find('input[name=message]').value = "";
        var name = Cookie.get("loggedInName");
        var userId = Cookie.get("userId");
        Destinations.update(id, {
          $push: {
            messages: {
              name: name,
              userId: userId,
              text: comment,
              date: new Date()
            }
          }
        });
        Tracker.afterFlush(function() {
          var div = template.find('div.messageContainer');

          $(div).scrollTop($(div).prop("scrollHeight"));
        });
      } else {
        Notifications.warn("So nicht.", "Gib einen Text ein!", options);
      }
    }
  });

  Template.destination.helpers({
    movementIs: function(mvmt) {
      return mvmt == this.movement;
    },

    hasJoiners: function(mvmt) {
      return this.joiners.length > 0;
    },

    hasJoined: function() {
      for (var i in this.joiners) {
        if (this.joiners[i].userId == Cookie.get("userId")) {
          return true;
        }
      }
      return false;
    },
    isNotEmpty: function(text) {
      return typeof text !== 'undefined' && text.length > 0;
    },
    hasLink: function() {
      var dest = this.dest;

      var ft = Foodtemples.findOne({
        name: dest
      });
      if (typeof ft == 'undefined' || typeof ft.link == 'undefined') {
        return false;
      }
      return (ft.link.length > 0);
    },
    getLink: function(foodtemple) {
      return Foodtemples.findOne({
        name: foodtemple
      }).link;
    },
    joinerMovementType: function() {
      return (this.movement == 'fährt') ? 'fahren' : 'kommen';
    },
    freeSeats: function(mvmt) {
      return this.seats - this.joiners.length;
    },

    isOwner: function(id) {
      return id == Cookie.get("userId");
    },
    hasSpaceLeftAndCanJoin: function() {
      return (this.seats == -1 || (this.seats - this.joiners.length)) > 0 && !hasJoinedYet();
    }
  });



  hasJoinedYet = function() {
    var hasJoined = false;
    var userId = Cookie.get("userId");
    Destinations.find().forEach(function(row) {
      if (row.userId == userId) {
        hasJoined = true;
        return;
      }
      var joiners = row.joiners;
      for (var joiner in joiners) {
        if (joiners[joiner].userId == userId) {
          hasJoined = true;
          return;
        }
      }
    });
    return hasJoined;
  };


}

if (Meteor.isServer) {
  Meteor.startup(function() {
    var cleanup = function() {
      Destinations.find().forEach(function(post) {
        Destinations.remove(post._id);
      });
    };

    if (Foodtemples.find().count() === 0) {
      var names = [{
        name: "McDonalds",
        link: "mcdonalds.de"
      }, {
        name: "Marktkauf",
        link: "marktkauf.de"
      }, {
        name: "Burger King",
        link: "burgerking.de"
      }, {
        name: "Credo",
        link: "credo-ristorante.de"
      }, {
        name: "Dornier Museum",
        link: "dorniermuseum.de"
      }, {
        name: "Forum",
        link: "www.forum-restaurant.de"
      }, {
        name: "Bahnschrankenthai",
        link: ""
      }, {
        name: "Bodenseecenter-Döner",
        link: ""
      }, {
        name: "XXXLutz",
        link: "xxxlutz.de"
      }, {
        name: "La Scala",
        link: "www.pizzeria-la-scala.de"
      }];

      for (var item in names) {
        Foodtemples.insert(names[item]);
      }
    }

  });
}
