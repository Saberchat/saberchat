const   express = require('express'),
        router = express.Router();

const   Comment = require('../models/comment');

router.get('/chat', (req, res) => {
	Comment.find({}, function(err, foundComments){
		if(err){
            console.log(err);
            req.flash('error', 'Comments could not be loaded');
		} else {
			if(!foundComments){
				console.log('no found comments!');
			}
			comments = foundComments
			res.render('chat', {comments: foundComments});
		}
	});
});

module.exports = router;