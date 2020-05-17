#!/bin/bash

cd $(dirname "$0")

./node_modules/.bin/sass --watch go/scss/go.scss go/css/go.css
