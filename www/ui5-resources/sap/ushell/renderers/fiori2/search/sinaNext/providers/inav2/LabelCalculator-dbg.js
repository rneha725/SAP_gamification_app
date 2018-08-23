/* global sinaDefine */
sinaDefine(['../../core/core'], function (core) {
    "use strict";

    var Node = core.defineClass({

        _init: function (parent, nodeId) {
            this.parent = parent;
            this.nodeId = nodeId;
            this.childMap = {};
            this.children = [];
        },

        insert: function (keyPath, dataSource) {

            // check for end of recursion
            if (keyPath.length === 0) {
                this.data = {
                    dataSource: dataSource,
                    label: dataSource.label,
                    labelPlural: dataSource.labelPlural
                };
                this.calculateLabel();
                return;
            }

            // insert recursively into tree
            var key = keyPath[0];
            var subNode = this.childMap[key];
            if (keyPath.length === 1 && subNode) {
                throw new core.Exception('duplicate tree node');
            }
            if (!subNode) {
                subNode = new Node(this, key);
                this.childMap[key] = subNode;
                this.children.push(subNode);
                if (this.children.length === 2) {
                    this.children[0].recalculateLabels();
                    // whenever a node gets a sibling -> recalculate labels of node because due to
                    // the sibling we need to add more keys to the label to make the label unique
                }
            }
            subNode.insert(keyPath.slice(1), dataSource);
        },

        recalculateLabels: function () {
            var leafs = [];
            this.collectLeafs(leafs);
            for (var i = 0; i < leafs.length; ++i) {
                leafs[i].calculateLabel();
            }
        },

        collectLeafs: function (leafs) {
            if (this.isLeaf()) {
                leafs.push(this);
                return;
            }
            for (var i = 0; i < this.children.length; ++i) {
                this.children[i].collectLeafs(leafs);
            }
        },

        isLeaf: function () {
            return this.children.length === 0;
        },

        hasSibling: function () {
            return this.parent && this.parent.children.length >= 2;
        },

        isChildOfRoot: function () {
            return this.parent && this.parent.nodeId === '__ROOT';
        },

        collectPath: function (keyPath, force) {
            if (!this.parent) {
                return;
            }
            if (force || this.hasSibling() || this.isChildOfRoot()) {
                keyPath.push(this.nodeId);
                force = true;
            }
            if (this.parent) {
                this.parent.collectPath(keyPath, force);
            }
        },

        calculateLabel: function () {

            // collect key
            var keyPath = [];
            this.collectPath(keyPath);
            keyPath.reverse();

            // assemble label
            keyPath.splice(0, 1, this.data.label);
            this.data.dataSource.label = keyPath.join(' ');

            // assemble label plural
            keyPath.splice(0, 1, this.data.labelPlural);
            this.data.dataSource.labelPlural = keyPath.join(' ');
        }
    });

    return core.defineClass({

        _init: function () {
            this.rootNode = new Node(null, '__ROOT');
        },

        splitId: function (id) {
            //CER002~EPM_PD_DEMO~
            if (id[6] !== '~') {
                return {
                    system: '__DUMMY',
                    client: '__DUMMY'
                };
            }
            return {
                system: id.slice(0, 3),
                client: id.slice(3, 6)
            };
        },

        calculateLabel: function (dataSource) {

            // this method calculates a unique label for the dataSource by concatenating system and client
            // system and client are only concatenated if necessary
            // previously calculated labels are recalculated if necessary

            // extract system and client from datasource id
            var splittedId = this.splitId(dataSource.id);

            // insert datasource into datasource tree
            // for the inserted datasource a unique label is calculated
            // for datasource in sibling tree branches the label is recalculated
            //this.rootNodeLabel.insert([dataSource.label, splittedId.system, splittedId.client], dataSource);
            try {
                this.rootNode.insert([dataSource.labelPlural, splittedId.system, splittedId.client], dataSource);
            } catch (e) {
                if (e instanceof core.Exception && e.toString() === 'duplicate tree node') {
                    var id = core.generateId();
                    dataSource.label = dataSource.label + id;
                    dataSource.labelPlural = dataSource.labelPlural + id;
                    return;
                }
                throw e;
            }

            // examples:

            // datasource     system client    --> calculated label
            // Purchase Order CER    002           Purchase Order
            // Sales Order    CER    002           Sales Order

            // datasource     system client    --> calculated label         include system to make label unique
            // Purchase Order CER    002           Purchase Order CER
            // Purchase Order CES    003           Purchase Order CES

            // datasource     system client    --> calculated label        include system and client to make label unique
            // Purchase Order CES    002           Purchase Order CES 002
            // Purchase Order CES    003           Purchase Order CES 003

        }

    });


});
