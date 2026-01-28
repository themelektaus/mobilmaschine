Object.defineProperties(EventTarget.prototype, {
    create: {
        value: function() {
            const element = document.createElement(...arguments)
            if (this instanceof Node)
                this.appendChild(element)
            return element
        }
    },
    query: {
        value: function() {
            const $ = this instanceof Window ? document : this
            return $.querySelector(...arguments)
        }
    },
    queryAll: {
        value: function() {
            const $ = this instanceof Window ? document : this
            return $.querySelectorAll(...arguments)
        }
    },
    on: {
        value: function() {
            this.addEventListener(...arguments)
            return this
        }
    }
});
