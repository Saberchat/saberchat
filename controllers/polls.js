

const controller = {}

controller.index = async function(req, res) {
    res.render('polls/index');
}

module.exports = controller;