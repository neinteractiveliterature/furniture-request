var express = require('express');
var csrf = require('csurf');
var async = require('async');
var _ = require('underscore');
var funitureHelper = require('../lib/furniture-helper');
var permission = require('../lib/permission');

function list(req, res, next){
    res.locals.breadcrumbs = {
       path: [
            { url: '/', name: 'Home'},
        ],
        current: 'Furniture'
    };
    req.models.furniture.list(function(err, furnitures){
        if (err) { return next(err); }
        res.locals.furnitures = furnitures || [];
        res.render('furniture/index', { pageTitle: 'Furniture' });
    });
}

function showNew(req, res, next){
    res.locals.furniture = {
        name: null,
        description: null,
        max_amount: 10,
        internal: false
    };
    res.locals.breadcrumbs = {
       path: [
            { url: '/', name: 'Home'},
            { url: '/furniture', name: 'Furniture'},
        ],
        current: 'New'
    };

    res.locals.csrfToken = req.csrfToken();
    if (_.has(req.session, 'furnitureData')){
        res.locals.furniture = req.session.furnitureData;
        delete req.session.furnitureData;
    }
    res.render('furniture/new');
}
function showEdit(req, res, next){
    var id = req.params.id;
    res.locals.csrfToken = req.csrfToken();


    req.models.furniture.get(id, function(err, furniture){
        if (err) { return next(err); }
        res.locals.furniture = furniture;
        if (_.has(req.session, 'furnitureData')){
            res.locals.furniture = req.session.furnitureData;
            delete req.session.furnitureData;
        }
        res.locals.breadcrumbs = {
           path: [
                { url: '/', name: 'Home'},
                { url: '/furniture', name: 'Furniture'},
            ],
            current: 'Edit: ' + furniture.name
        };

        res.render('furniture/edit');
    });
}

function create(req, res, next){
    var furniture = req.body.furniture;

    req.session.furnitureData = furniture;

    req.models.furniture.create(furniture, function(err, newFurnitureId){
        if (err) {
            req.flash('error', err.toString())
            return res.redirect('/furniture/new');
        }
        delete req.session.furnitureData;
        req.flash('success', 'Created Furniture ' + furniture.name);
        res.redirect('/furniture');
    });
}

function update(req, res, next){
    var id = req.params.id;
    var furniture = req.body.furniture;
    req.session.furnitureData = furniture;

    req.models.furniture.get(id, function(err, current){
        if (err) { return next(err); }
        furniture.display_order = current.display_order;


        req.models.furniture.update(id, furniture, function(err){
            if (err){
                req.flash('error', err.toString())
                return (res.redirect('/furniture/'+id));
            }
            delete req.session.furnitureData;
            req.flash('success', 'Updated Furniture ' + furniture.name);
            res.redirect('/furniture');
        });
    })
}

function remove(req, res, next){
    var id = req.params.id;
    req.models.furniture.delete(id, function(err){
        if (err) { return next(err); }
        req.flash('success', 'Removed Furniture');
        res.redirect('/furniture');
    });
}

function sort(req, res, next){
    var order = req.body.order;
    async.eachOf(order, function(id, idx, cb){
        req.models.furniture.get(id, function(err, furniture){
            if (err) { return cb(err); }
            furniture.display_order = idx;
            req.models.furniture.update(id, furniture, cb);
        });
    }, function(err){
        if (err) { return next(err); }
        res.json({success:true});
    });
}

var router = express.Router();
router.use(funitureHelper.setSection('furniture'));
router.use(permission('gm_liaison'));

router.get('/', list);
router.get('/new', csrf(), showNew);
router.get('/:id', csrf(), showEdit);

router.post('/', csrf(), create);

router.put('/sort', sort);
router.put('/:id', csrf(), update);

router.delete('/:id', remove);

module.exports = router;

