import {
  NullVisitor,
  ParsedVisitor,
  ParseMethod,
  ParseResult,
  ParseIntersectionType,
  ParseTypeAliasDeclaration,
  ParseGeneric,
  ParseInterfaceDeclaration,
  ParseProperty,
  ParseVariableDeclaration,
  ParseClassDeclaration,
  ParseUnionType,
  ParseValueType,
  ParsePrimitiveType,
  ParseTypeLiteral,
  ParseNode,
  ParseDecorator,
  ParseObjectLiteral,
  ParseArrayLiteral,
  Primitives,
  ParseEmpty,
} from '../parsed-nodes';
import { flatten } from 'lodash';
import { NodeTags, mergeClassMembers } from '../utils';

/**
 * @description
 * The object properties that should be used from the
 * `@Component` decorator of an angular component.
 */
const COMPONENT_DECORATOR_ITEMS = ['selector', 'exportAs', 'inputs'];

/**
 * @description
 * A list of NodeTags for properties that should not be exported.
 * Those properties where only used to resolve types.
 */
const INTERNAL_MEMBERS: NodeTags[] = ['hasUnderscore', 'private', 'protected', 'internal', 'unrelated'];

const ANGULAR_LIFE_CYCLE_METHODS = [
  'ngOnChanges',
  'ngOnInit',
  'ngDoCheck',
  'ngAfterContentInit',
  'ngAfterContentChecked',
  'ngAfterViewInit',
  'ngAfterViewChecked',
  'ngOnDestroy',
];

/**
 * @description
 * Resolve primitive values like booleans to true/false in case that
 * we need the possible variants.
 */
function resolvePrimitiveType(nodeType: ParsePrimitiveType): string[] | null {
  switch (nodeType.type) {
    case Primitives.Boolean:
      return ['true', 'false'];
    default:
      // don't resolve undefined and null Values we dont need the undefined or null state
      return null;
  }
}

/**
 * @class
 * @classdesc
 * The meta resolver is responsible to take the parsed abstract syntax tree that was
 * generated with the parsed nodes classes and resolves it to a more human readable object
 * format. So any nodes that we do not need in the output will be dropped by returning null
 * and the nodes where we need the information are getting visited and returned as custom
 * objects or arrays.
 * We try to reduce the complex AST to the angular components that can have properties as members.
 * This Resolver needs the resolved references from the `ReferenceResolver` to generate a meaningful
 * output.
 *
 * The output is going to be consumed by the `@sketchmine/app-builder` to generate the different variants
 * of the angular components.
 */
export class MetaResolver extends NullVisitor implements ParsedVisitor {

  /**
   * @description
   * returns a visited array of the literal values
   */
  visitArrayLiteral(node: ParseArrayLiteral): any {
    return this.visitAllWithParent(node.values, node);
  }

  /**
   * @description
   * Visits a class declaration and determines if it is an angular component
   * or just a normal es6 class.
   */
  visitClassDeclaration(node: ParseClassDeclaration): any {
    // if the class is marked as design unrelated we don't care anymore
    if (node.tags.includes('unrelated')) {
      return undefined;
    }

    const members = this.visitAllWithParent(node.members, node);
    const extending = this.visitWithParent(node.extending, node);
    const mergedMembers = mergeClassMembers(extending, ...members);

    // if it is not an angular component we do not need the class information and
    // the decorator information we only want to know the extends and members
    // of this class
    if (!node.isAngularComponent() || node._parentNode.constructor !== ParseResult) {
      // return the members array merged with the extending
      return mergedMembers;
    }

    const decorator = this.visitWithParent(node.decorators[0], node);
    const selector = decorator && decorator.selector
      ? decorator.selector
        .split(',')
        .map(s => s.replace(/[\`\s\'\"]/gm, ''))
      : null;

    const componentName = /.+?\/([^\/]+?).ts$/.exec(node.location.path);

    // add the keys of the members to the allowed members set this set is used to check if
    // only @Inputs and inputs from the component decorator are used as members.
    const allowedMembers = new Set<string>(members.map(member => member.key));

    if (decorator.inputs && decorator.inputs.length) {
      for (let i = 0, max = decorator.inputs.length; i < max; i += 1) {
        const input = decorator.inputs[i].replace(/[\`\s\'\"]/gm, '');
        allowedMembers.add(input);
      }
    }

    return {
      name: node.name,
      /** @example https://regex101.com/r/YduQlF/1 */
      component: componentName && componentName.length && componentName.length > 0 ? componentName[1] : node.name,
      selector,
      angularComponent: node.isAngularComponent(),
      decorator,
      combinedVariants: !node.tags.includes('noCombinations'),
      members: mergedMembers.filter(m => allowedMembers.has(m.key)),
    };
  }

  /**
   * @description
   * visits a decorator, when it is a component decorator on a class declaration
   * we know it is an angular component, otherwise we ignore it at the moment
   * can be used later on to identify host listeners for click events!
   */
  visitDecorator(node: ParseDecorator): any {
    if (
      node._parentNode &&
      node._parentNode.constructor === ParseClassDeclaration &&
      (node._parentNode as ParseClassDeclaration).isAngularComponent()
    ) {
      const properties = {};
      node.args.forEach((arg: ParseObjectLiteral) =>
        arg.properties.forEach((prop: ParseProperty) => {
          // if the
          if (COMPONENT_DECORATOR_ITEMS.includes(prop.name)) {
            properties[prop.name] = this.propertyVisitStrategy(prop);
          }
        }));
      return properties;
    }
    // TODO: lukas.holzer visitDecorator in method and property as well
    // currently not reachable! – we check for angular components in visit class declaration
//     log.warning(`Only @Component decorators are handled yet!
// Not @${node.name}
//     `);
  }

  /**
   * @description
   * returns an array of the values from the properties.
   */
  visitObjectLiteral(node: ParseObjectLiteral): any {
    return this.visitAll(node.properties);
  }

  /**
   * @description
   * visits the extending reference and the members of an interface declaration.
   */
  visitInterfaceDeclaration(node: ParseInterfaceDeclaration): any {
    const members = this.visitAllWithParent(node.members, node);
    const extending = this.visitWithParent(node.extending, node);

    if (!!extending) {
      // return the merged and flattened values from the extending and members
      // and filter all falsy values (undefined, null)
      return flatten([extending, members]).filter(v => !!v);
    }

    return members;
  }

  /**
   * @description
   * return a flattened array of the visited types of an intersection type.
   * An intersection type combines multiple types to one.
   */
  visitIntersectionType(node: ParseIntersectionType): any {
    const types = this.visitAllWithParent(node.types, node);
    return flatten(types);
  }

  /**
   * @description
   * visits the method and if the parent node is a class it will return undefined
   * if the methods parent is not a class declaration we want to know the return type
   * in case that the method is used to assign data.
   *
   * @todo lukas.holzer@dynatrace.com check for method parameters later
   * if there is the need to call methods on a component to get a state!
   */
  visitMethod(node: ParseMethod): any {
    const returnType = this.visitWithParent(node.returnType, node);

    // if the parent node is not a class declaration we do not need the parameters only
    // the return type.
    // if the parent type is a property then the property was a method like
    // `compareWith(fn: (v1: T, v2: T) => boolean)` – In this case we want to know that the property is a method!
    if (
      node._parentNode &&
      node._parentNode.constructor !== ParseClassDeclaration &&
      node._parentNode.constructor !== ParseProperty
    ) {
      return returnType;
    }

    const isLifeCycleHook = ANGULAR_LIFE_CYCLE_METHODS.includes(node.name);
    const isInternal = node.tags.some((tag: NodeTags) =>
      INTERNAL_MEMBERS.includes(tag));

    // if the method is private or internal or an angular life cycle hook we can skip
    // it in the resulting object.
    if (isInternal || isLifeCycleHook) {
      return;
    }

    return {
      type: 'method',
      key: node.name,
      parameters: this.visitAllWithParent(node.parameters, node),
      returnType,
    };
  }

  /**
   * @description
   * returns a visited array of all values of a union type
   */
  visitUnionType(node: ParseUnionType): any {
    return this.visitAllWithParent(node.types, node);
  }

  visitProperty(node: ParseProperty): any {

    // we only want to parse @Input's of an Angular component
    // so when a property is a child of a class declaration we need to
    // check if it has an input decorator if it is not we can ignore it
    if (
      node._parentNode &&
      node._parentNode.constructor === ParseClassDeclaration &&
      (<ParseClassDeclaration>node._parentNode).isAngularComponent() &&
      !node.isAngularInput()
    ) {
      return;
    }

    // If a property includes some tags like private or internal we do not want
    // to use this properties so return undefined instead.
    const isInternal = node.tags.some((tag: NodeTags) =>
      INTERNAL_MEMBERS.includes(tag));

    const value = this.propertyVisitStrategy(node as ParseProperty);

    if (isInternal || !value) {
      return;
    }

    const propertyValue = Array.isArray(value) ? value : [value];

    // only string values are allowed in the property Values array every value has to be escaped as string!
    if (typeof propertyValue[0] !== 'string') {
      return;
    }

    return {
      type: 'property',
      key: node.name,
      value: propertyValue,
    };
  }

  visitPrimitiveType(node: ParsePrimitiveType) {

    return resolvePrimitiveType(node);
  }

  visitTypeLiteral(node: ParseTypeLiteral) {
    return this.visitAllWithParent(node.members, node);
  }

  visitValueType(node: ParseValueType) {
    if (typeof node.value === 'number') {
      return `${node.value}`;
    }

    // if we have an empty string return undefined
    if (
      typeof node.value === 'string' &&
      node.value.replace(/\"/gm, '').trim().length === 0
    ) {
      return;
    }
    return node.value;
  }

  /**
   * @description
   * The visit result function is used to visit files. Every file has its ParseResult.
   * In case that we want to get the information from our angular components we can filter
   * all root nodes for class declarations and then for angular components.
   */
  visitResult(node: ParseResult): any[] {
    const rootNodes = [];

    for (let i = 0, max = node.nodes.length; i < max; i += 1) {
      const rootNode = node.nodes[i];
      if (
        rootNode &&
        rootNode.constructor === ParseClassDeclaration &&
        (<ParseClassDeclaration>rootNode).isAngularComponent()
      ) {
        const visitedNode = this.visitWithParent(rootNode, node);
        if (visitedNode) {
          rootNodes.push(visitedNode);
        }
      }
    }

    return rootNodes;
  }

  /**
   * @description
   * returns the visited type of the type alias declaration.
   */
  visitTypeAliasDeclaration(node: ParseTypeAliasDeclaration): any {
    return this.visitWithParent(node.type, node);
  }

  /**
   * @description
   * returns the visited value of the variable declaration.
   */
  visitVariableDeclaration(node: ParseVariableDeclaration): any {
    return this.propertyVisitStrategy(node as ParseVariableDeclaration);
  }

  /**
   * @description
   * uses the visiting strategy `propertyVisitStrategy` to return the passed type or value.
   */
  visitGeneric(node: ParseGeneric): any {
    const constraint = this.visitWithParent(node.constraint, node);
    const value = this.propertyVisitStrategy(node as ParseGeneric);
    if (!!constraint) {
      // return the merged and flattened values from the constraints and values
      // and filter all falsy values (undefined, null)
      return flatten([constraint, value]).filter(v => !!v);
    }

    // if we have no constraints return only the value.
    return value;
  }

  /**
   * @description
   * Uses the visit function from the NullVisitor but modifies the node so that it
   * has an internal property `_parentNode` on it to identify later in which context
   * the node is used.
   */
  visitWithParent(node: ParseNode, parent: ParseNode): any {
    // if we have no node return undefined.
    if (!node) { return; }

    // add the internal _parentNode reference to the node itself.
    node._parentNode = parent;

    // call the visit function from the NullVisitor with the modified node.
    return super.visit(node);
  }

  /**
   * @description
   * Uses the same principles like the `visitAll` function from the NullVisitor,
   * with the only difference that it passes a parent node to the wrapping `visitWithParent` function.
   */
  visitAllWithParent(nodes: ParseNode[], parent: ParseNode): any[] {
    // if we have no nodes return an empty array like the `visitAll` function in the NullVisitor.
    if (!nodes) { return []; }

    const result = [];

    for (let i = 0, max = nodes.length; i < max; i += 1) {
      const node = nodes[i];

      const visited = this.visitWithParent(node, parent);
      if (visited) {
        result.push(visited);
      }
    }

    return result;
  }

  /**
   * @description
   * this function is used to define a strategy how values and types should be handled
   * in case of which information should be prioritized. In case that we often have no type
   * but maybe the value can be used as type.
   */
  private propertyVisitStrategy(node: ParseProperty | ParseGeneric) {
    if (!!node.type && node.type && node.type.constructor !== ParseEmpty) {
      return this.visitWithParent(node.type, node);
    }

    if (!!node.value) {
      return this.visitWithParent(node.value, node);
    }
  }
}
