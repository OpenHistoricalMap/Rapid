describe('Graph', () => {

  describe('constructor', () => {
    it('accepts an entities Array', () => {
      const entity = Rapid.osmEntity();
      const graph = new Rapid.Graph([entity]);
      expect(graph.entity(entity.id)).to.equal(entity);
    });

    it('accepts a Graph', () => {
      const entity = Rapid.osmEntity();
      const graph1 = new Rapid.Graph([entity]);
      const graph2 = new Rapid.Graph(graph1);
      expect(graph2.entity(entity.id)).to.equal(entity);
    });

    it('shallow copies other\'s entities', () => {
      const entity = Rapid.osmEntity();
      const graph1 = new Rapid.Graph([entity]);
      const graph2 = new Rapid.Graph(graph1);
      expect(graph2.local).to.not.equal(graph1.local);
      expect(graph2.local.entities).not.to.equal(graph1.local.entities);
    });

    it('shares base data among chain of Graphs', () => {
      const graph1 = new Rapid.Graph();
      const graph2 = new Rapid.Graph(graph1);
      expect(graph2.base).to.equal(graph1.base);
    });

    it('freezes by default', () => {
      expect(new Rapid.Graph().frozen).to.be.true;
    });

    it('remains mutable if passed true as second argument', () => {
      expect(new Rapid.Graph([], true).frozen).to.be.false;
    });
  });

  describe('#hasEntity', () => {
    it('returns the entity when present', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      expect(graph.hasEntity(node.id)).to.equal(node);
    });

    it('returns undefined when the entity is not present', () => {
      expect(new Rapid.Graph().hasEntity('1')).to.be.undefined;
    });
  });

  describe('#entity', () => {
    it('returns the entity when present', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      expect(graph.entity(node.id)).to.equal(node);
    });

    it('throws when the entity is not present', () => {
      expect(() => { Rapid.Graph().entity('1'); }).to.throw;
    });
  });

  describe('#rebase', () => {
    it('preserves existing entities', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const graph = new Rapid.Graph([node]);
      graph.rebase([], [graph]);
      expect(graph.entity('n')).to.equal(node);
    });

    it('includes new entities', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const graph = new Rapid.Graph();
      graph.rebase([node], [graph]);
      expect(graph.entity('n')).to.equal(node);
    });

    it('doesn\'t rebase deleted entities', () => {
      const node = Rapid.osmNode({ id: 'n', visible: false });
      const graph = new Rapid.Graph();
      graph.rebase([node], [graph]);
      expect(graph.hasEntity('n')).to.be.not.ok;
    });

    it('gives precedence to existing entities', () => {
      const a = Rapid.osmNode({ id: 'n' });
      const b = Rapid.osmNode({ id: 'n' });
      const graph = new Rapid.Graph([a]);
      graph.rebase([b], [graph]);
      expect(graph.entity('n')).to.equal(a);
    });

    it('gives precedence to new entities when force = true', () => {
      const a = Rapid.osmNode({ id: 'n' });
      const b = Rapid.osmNode({ id: 'n' });
      const graph = new Rapid.Graph([a]);
      graph.rebase([b], [graph], true);
      expect(graph.entity('n')).to.equal(b);
    });

    it('inherits entities from base', () => {
      const graph = new Rapid.Graph();
      graph.rebase([Rapid.osmNode({ id: 'n' })], [graph]);
      expect(graph.local.entities).to.not.have.any.keys('n');
      expect(graph.base.entities).to.have.all.keys('n');
    });

    it('updates parentWays', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w1', nodes: ['n'] });
      const w2 = Rapid.osmWay({ id: 'w2', nodes: ['n'] });
      const graph = new Rapid.Graph([n, w1]);
      graph.rebase([w2], [graph]);
      expect(graph.parentWays(n)).to.have.members([w1, w2]);
      expect(graph.local.parentWays).to.not.have.any.keys('n');
      expect(graph.base.parentWays).to.have.all.keys('n');
    });

    it('avoids adding duplicate parentWays', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w1', nodes: ['n'] });
      const graph = new Rapid.Graph([n, w1]);
      graph.rebase([w1], [graph]);
      expect(graph.parentWays(n)).to.have.members([w1]);
    });

    it('updates parentWays for nodes with modified parentWays', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w1', nodes: ['n'] });
      const w2 = Rapid.osmWay({ id: 'w2', nodes: ['n'] });
      const w3 = Rapid.osmWay({ id: 'w3', nodes: ['n'] });
      const graph = new Rapid.Graph([n, w1]);
      const graph2 = graph.replace(w2);
      graph.rebase([w3], [graph, graph2]);
      expect(graph2.parentWays(n)).to.have.members([w1, w2, w3]);
    });

    it('avoids re-adding a modified way as a parent way', () => {
      const n1 = Rapid.osmNode({ id: 'n1' });
      const n2 = Rapid.osmNode({ id: 'n2' });
      const w1 = Rapid.osmWay({ id: 'w1', nodes: ['n1', 'n2'] });
      const w2 = w1.removeNode('n2');
      const graph = new Rapid.Graph([n1, n2, w1]);
      const graph2 = graph.replace(w2);
      graph.rebase([w1], [graph, graph2]);
      expect(graph2.parentWays(n2)).to.eql([]);
    });

    it('avoids re-adding a deleted way as a parent way', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w1', nodes: ['n'] });
      const graph = new Rapid.Graph([n, w1]);
      const graph2 = graph.remove(w1);
      graph.rebase([w1], [graph, graph2]);
      expect(graph2.parentWays(n)).to.eql([]);
    });

    it('re-adds a deleted node that is discovered to have another parent', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w1', nodes: ['n'] });
      const w2 = Rapid.osmWay({ id: 'w2', nodes: ['n'] });
      const graph = new Rapid.Graph([n, w1]);
      const graph2 = graph.remove(n);
      graph.rebase([n, w2], [graph, graph2]);
      expect(graph2.entity('n')).to.eql(n);
    });

    it('updates parentRelations', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r1', members: [{ id: 'n'}] });
      const r2 = Rapid.osmRelation({ id: 'r2', members: [{ id: 'n'}] });
      const graph = new Rapid.Graph([n, r1]);
      graph.rebase([r2], [graph]);
      expect(graph.parentRelations(n)).to.have.members([r1, r2]);
      expect(graph.local.parentRels).to.not.have.any.keys('n');
      expect(graph.base.parentRels).to.have.all.keys('n');
    });

    it('avoids re-adding a modified relation as a parent relation', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r1', members: [{ id: 'n'}] });
      const r2 = r1.removeMembersWithID('n');
      const graph = new Rapid.Graph([n, r1]);
      const graph2 = graph.replace(r2);
      graph.rebase([r1], [graph, graph2]);
      expect(graph2.parentRelations(n)).to.eql([]);
    });

    it('avoids re-adding a deleted relation as a parent relation', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r1', members: [{ id: 'n'}] });
      const graph = new Rapid.Graph([n, r1]);
      const graph2 = graph.remove(r1);
      graph.rebase([r1], [graph, graph2]);
      expect(graph2.parentRelations(n)).to.eql([]);
    });

    it('updates parentRels for nodes with modified parentWays', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r1', members: [{ id: 'n'}] });
      const r2 = Rapid.osmRelation({ id: 'r2', members: [{ id: 'n'}] });
      const r3 = Rapid.osmRelation({ id: 'r3', members: [{ id: 'n'}] });
      const graph = new Rapid.Graph([n, r1]);
      const graph2 = graph.replace(r2);
      graph.rebase([r3], [graph, graph2]);
      expect(graph2.parentRelations(n)).to.have.members([r1, r2, r3]);
    });

    it('invalidates transients', () => {
      const n = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w1', nodes: ['n'] });
      const w2 = Rapid.osmWay({ id: 'w2', nodes: ['n'] });
      const graph = new Rapid.Graph([n, w1]);

      function numParents(entity) {
        return graph.transient(entity, 'numParents', () => {
          return graph.parentWays(entity).length;
        });
      }

      expect(numParents(n)).to.equal(1);
      graph.rebase([w2], [graph]);
      expect(numParents(n)).to.equal(2);
    });
  });

  describe('#remove', () => {
    it('returns a new graph', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      expect(graph.remove(node)).not.to.equal(graph);
    });

    it('doesn\'t modify the receiver', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      graph.remove(node);
      expect(graph.entity(node.id)).to.equal(node);
    });

    it('removes the entity from the result', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      expect(graph.remove(node).hasEntity(node.id)).to.be.undefined;
    });

    it('removes the entity as a parentWay', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w', nodes: ['n'] });
      const graph = new Rapid.Graph([node, w1]);
      expect(graph.remove(w1).parentWays(node)).to.eql([]);
    });

    it('removes the entity as a parentRelation', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'w', members: [{ id: 'n' }] });
      const graph = new Rapid.Graph([node, r1]);
      expect(graph.remove(r1).parentRelations(node)).to.eql([]);
    });
  });

  describe('#replace', () => {
    it('is a no-op if the replacement is identical to the existing entity', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      expect(graph.replace(node)).to.equal(graph);
    });

    it('returns a new graph', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      expect(graph.replace(node.update())).not.to.equal(graph);
    });

    it('doesn\'t modify the receiver', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      graph.replace(node);
      expect(graph.entity(node.id)).to.equal(node);
    });

    it('replaces the entity in the result', () => {
      const node1 = Rapid.osmNode();
      const node2 = node1.update({});
      const graph = new Rapid.Graph([node1]);
      expect(graph.replace(node2).entity(node2.id)).to.equal(node2);
    });

    it('adds parentWays', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w', nodes: ['n'] });
      const graph = new Rapid.Graph([node]);
      expect(graph.replace(w1).parentWays(node)).to.have.members([w1]);
    });

    it('removes parentWays', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w', nodes: ['n'] });
      const graph = new Rapid.Graph([node, w1]);
      expect(graph.remove(w1).parentWays(node)).to.eql([]);
    });

    it('doesn\'t add duplicate parentWays', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w', nodes: ['n'] });
      const graph = new Rapid.Graph([node, w1]);
      expect(graph.replace(w1).parentWays(node)).to.have.members([w1]);
    });

    it('adds parentRelations', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r', members: [{ id: 'n'}] });
      const graph = new Rapid.Graph([node]);
      expect(graph.replace(r1).parentRelations(node)).to.have.members([r1]);
    });

    it('removes parentRelations', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r', members: [{ id: 'n'}] });
      const graph = new Rapid.Graph([node, r1]);
      expect(graph.remove(r1).parentRelations(node)).to.eql([]);
    });

    it('doesn\'t add duplicate parentRelations', () => {
      const node = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r', members: [{ id: 'n'}] });
      const graph = new Rapid.Graph([node, r1]);
      expect(graph.replace(r1).parentRelations(node)).to.have.members([r1]);
    });
  });

  describe('#revert', () => {
    it('is a no-op if the head entity is identical to the base entity', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const graph = new Rapid.Graph([n1]);
      expect(graph.revert('n')).to.equal(graph);
    });

    it('returns a new graph', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const n2 = n1.update({});
      const graph = new Rapid.Graph([n1]).replace(n2);
      expect(graph.revert('n')).not.to.equal(graph);
    });

    it('doesn\'t modify the receiver', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const n2 = n1.update({});
      const graph = new Rapid.Graph([n1]).replace(n2);
      graph.revert('n');
      expect(graph.hasEntity('n')).to.equal(n2);
    });

    it('removes a new entity', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      let graph = new Rapid.Graph().replace(n1);
      graph = graph.revert('n');
      expect(graph.hasEntity('n')).to.be.undefined;
    });

    it('reverts an updated entity to the base version', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const n2 = n1.update({});
      let graph = new Rapid.Graph([n1]).replace(n2);
      graph = graph.revert('n');
      expect(graph.hasEntity('n')).to.equal(n1);
    });

    it('restores a deleted entity', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      let graph = new Rapid.Graph([n1]).remove(n1);
      graph = graph.revert('n');
      expect(graph.hasEntity('n')).to.equal(n1);
    });

    it('removes new parentWays', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w', nodes: ['n'] });
      let graph = new Rapid.Graph().replace(n1).replace(w1);
      graph = graph.revert('w');
      expect(graph.hasEntity('n')).to.equal(n1);
      expect(graph.parentWays(n1)).to.eql([]);
    });

    it('removes new parentRelations', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r', members: [{ id: 'n'}] });
      let graph = new Rapid.Graph().replace(n1).replace(r1);
      graph = graph.revert('r');
      expect(graph.hasEntity('n')).to.equal(n1);
      expect(graph.parentRelations(n1)).to.eql([]);
    });

    it('reverts updated parentWays', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w', nodes: ['n'] });
      const w2 = w1.removeNode('n');
      let graph = new Rapid.Graph([n1, w1]).replace(w2);
      graph = graph.revert('w');
      expect(graph.hasEntity('n')).to.equal(n1);
      expect(graph.parentWays(n1)).to.have.members([w1]);
    });

    it('reverts updated parentRelations', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r', members: [{ id: 'n'}] });
      const r2 = r1.removeMembersWithID('n');
      let graph = new Rapid.Graph([n1, r1]).replace(r2);
      graph = graph.revert('r');
      expect(graph.hasEntity('n')).to.equal(n1);
      expect(graph.parentRelations(n1)).to.have.members([r1]);
    });

    it('restores deleted parentWays', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const w1 = Rapid.osmWay({ id: 'w', nodes: ['n'] });
      let graph = new Rapid.Graph([n1, w1]).remove(w1);
      graph = graph.revert('w');
      expect(graph.hasEntity('n')).to.equal(n1);
      expect(graph.parentWays(n1)).to.have.members([w1]);
    });

    it('restores deleted parentRelations', () => {
      const n1 = Rapid.osmNode({ id: 'n' });
      const r1 = Rapid.osmRelation({ id: 'r', members: [{ id: 'n'}] });
      let graph = new Rapid.Graph([n1, r1]).remove(r1);
      graph = graph.revert('r');
      expect(graph.hasEntity('n')).to.equal(n1);
      expect(graph.parentRelations(n1)).to.have.members([r1]);
    });
  });

  describe('#update', () => {
    it('returns a new graph if self is frozen', () => {
      const graph = new Rapid.Graph();
      expect(graph.update()).not.to.equal(graph);
    });

    it('returns self if self is not frozen', () => {
      const graph = new Rapid.Graph([], true);
      expect(graph.update()).to.equal(graph);
    });

    it('doesn\'t modify self is self is frozen', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node]);
      graph.update(function (graph) { graph.remove(node); });
      expect(graph.entity(node.id)).to.equal(node);
    });

    it('modifies self is self is not frozen', () => {
      const node = Rapid.osmNode();
      const graph = new Rapid.Graph([node], true);
      graph.update(function (graph) { graph.remove(node); });
      expect(graph.hasEntity(node.id)).to.be.undefined;
    });

    it('executes all of the given functions', () => {
      const a = Rapid.osmNode();
      const b = Rapid.osmNode();
      let graph = new Rapid.Graph([a]);
      graph = graph.update(
        function (graph) { graph.remove(a); },
        function (graph) { graph.replace(b); }
      );

      expect(graph.hasEntity(a.id)).to.be.undefined;
      expect(graph.entity(b.id)).to.equal(b);
    });
  });

  describe('#parentWays', () => {
    it('returns an array of ways that contain the given node id', () => {
      const node = Rapid.osmNode({ id: 'n1' });
      const way = Rapid.osmWay({ id: 'w1', nodes: ['n1'] });
      const graph = new Rapid.Graph([node, way]);
      expect(graph.parentWays(node)).to.have.members([way]);
      expect(graph.parentWays(way)).to.eql([]);
    });
  });

  describe('#parentRelations', () => {
    it('returns an array of relations that contain the given entity id', () => {
      const node = Rapid.osmNode({ id: 'n1' });
      const nonnode = Rapid.osmNode({ id: 'n2' });
      const relation = Rapid.osmRelation({ id: 'r1', members: [{ id: 'n1', role: 'from' }] });
      const graph = new Rapid.Graph([node, relation]);
      expect(graph.parentRelations(node)).to.have.members([relation]);
      expect(graph.parentRelations(nonnode)).to.eql([]);
    });
  });

  describe('#childNodes', () => {
    it('returns an array of child nodes', () => {
      const node = Rapid.osmNode({ id: 'n1' });
      const way = Rapid.osmWay({ id: 'w1', nodes: ['n1'] });
      const graph = new Rapid.Graph([node, way]);
      expect(graph.childNodes(way)).to.have.members([node]);
    });
  });
});
