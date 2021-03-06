"use strict";

(function () {
    var $container, haveInitialized, newElems = [], indexKey =
        '__knockout-isotope-index', filterClass, itemClass, isotopeOptions;

    function beforeAdd(node, index, item, isInitializing) {
        var $elem;
        if (node.nodeType !== 1) {
            // This isn't an element node, nevermind
            return;
        }

        $elem = $(node);
        if (isInitializing !== true) {
            // Temporarily hide elements being added
            $elem.removeClass(filterClass);
            newElems.push(node);
            $container.isotope('addItems', $elem);
            // This performs the filtering
            $container.isotope();
        }
        $elem.data(indexKey, index);
    }

    function afterMove(node, index, item) {
        var $elem;
        if (node.nodeType !== 1) {
            // This isn't an element node, nevermind
            return;
        }

        $elem = $(node);
        $elem.data(indexKey, index);
        $container.isotope('updateSortData', $elem);
    }

    function beforeRemove(node, index, item) {
        if (node.nodeType !== 1) {
            // This isn't an element node, nevermind
            return;
        }

        $container.isotope('remove', $(node));
    }

    ko.bindingHandlers.isotope = {
        defaultFilterClass: 'knockout-isotope-filter', 
        defaultItemClass: 'knockout-isotope-item',
        _getSortData: function ($elem) {
            return $elem.data(indexKey);
        },
        // Wrap value accessor with options to the template binding,
        // which implements the foreach logic
        makeTemplateValueAccessor: function (valueAccessor) {
            return function() {
                var modelValue = valueAccessor(),
                    unwrappedValue = ko.utils.peekObservable(modelValue), options;    // Unwrap without setting a dependency here

                options = {
                    beforeAdd: beforeAdd,
                    afterMove: afterMove,
                    beforeRemove: beforeRemove
                };

                // If unwrappedValue is the array, pass in the wrapped value on its own
                // The value will be unwrapped and tracked within the template binding
                // (See https://github.com/SteveSanderson/knockout/issues/523)
                if (!unwrappedValue || typeof unwrappedValue.length === "number") {
                    ko.utils.extend(options, {
                        'foreach': modelValue,
                        'templateEngine': ko.nativeTemplateEngine.instance
                    });
                    return options;
                }

                // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
                ko.utils.unwrapObservable(modelValue);
                ko.utils.extend(options, {
                    'foreach': unwrappedValue.data,
                    'as': unwrappedValue.as,
                    'includeDestroyed': unwrappedValue.includeDestroyed,
                    'templateEngine': ko.nativeTemplateEngine.instance
                });
                return options;
            };
        },
        'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var parameters;
            filterClass = ko.bindingHandlers.isotope.defaultFilterClass;
            itemClass = ko.bindingHandlers.isotope.defaultItemClass;
            isotopeOptions = {};
            haveInitialized = false;
            $container = $(element);
            if ($container.children().length !== 1) {
                throw new Error('The element must have *1* child, from to instantiate Isotope items');
            }

            parameters = ko.utils.unwrapObservable(valueAccessor());
            if (parameters && typeof parameters == 'object' && !('length' in parameters)) {
                if (parameters.isotopeOptions) {
                    var clientOptions = parameters.isotopeOptions();
                    if (typeof clientOptions !== 'object') {
                        throw new Error('isotopeOptions callback must return object');
                    }
                    ko.utils.extend(isotopeOptions, clientOptions);
                }
                if (parameters.filterClass) {
                    filterClass = parameters.filterClass;
                }
                if (parameters.itemClass) {
                    itemClass = parameters.itemClass;
                }
            }
            
            // Adorn template with itemClass and filterClass, so that children
            // are found and displayed (not filtered) by Isotope
            $container.children()
                .addClass(itemClass)
                .addClass(filterClass);
          
            // Initialize template engine, moving child template element to an
            // "anonymous template" associated with the element
            ko.bindingHandlers.template.init(element,
                    ko.bindingHandlers.isotope.makeTemplateValueAccessor(valueAccessor));

            return { controlsDescendantBindings: true };
        },
        'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            ko.bindingHandlers.template.update(element,
                    ko.bindingHandlers.isotope.makeTemplateValueAccessor(valueAccessor),
                    allBindingsAccessor, viewModel, bindingContext);

            if (!haveInitialized) {
                isotopeOptions.itemSelector = '.' + itemClass;
                isotopeOptions.filter = '.' + filterClass;
                isotopeOptions.getSortData = { index: ko.bindingHandlers.isotope._getSortData };
                isotopeOptions.sortBy = 'index';
                
                // Elements are added to the DOM, now initialize Isotope
                $container.isotope(isotopeOptions);
            }
            else {
                // Show newly added elements
                $(newElems).addClass(filterClass);
                newElems.splice(0, newElems.length);
                // Update Isotope state
                $container.isotope();
            }

            // Make this function depend on the view model, so it gets called for updates
            var data = ko.bindingHandlers.isotope.makeTemplateValueAccessor(
                        valueAccessor)().foreach;
            ko.utils.unwrapObservable(data);

            // Update gets called upon initial rendering as well
            haveInitialized = true;
            return { controlsDescendantBindings: true };
        }
    };
})();

// vim: set sts=4 sw=4 et:
