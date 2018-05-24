import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PanResponder, Animated, Dimensions, StyleSheet, Image, View, Text,Platform } from 'react-native';

const window = Dimensions.get('window');
const width = window.width -30
const height = window.height/2 -30


const PESPECTIVE = Platform.OS === "ios" ? 2.38 : 1.54;
const TR_POSITION = Platform.OS === "ios" ? 2 : 2;

export default class CubeNavigationVertical extends Component {
	constructor(props) {
		super(props);
	
   this.pages = this.props.children.map((child, index) => height * -index);
    		this.state = {
			scrollLockPage: this.pages[this.props.scrollLockPage],
		};

	}

  componentWillMount() {
 
		this._animatedValue = new Animated.ValueXY();
		this._animatedValue.setValue({ x: 0, y: 0 });
		this._value = { x: 0, y: 0 };

		this._animatedValue.addListener(value => {
			this._value = value;
		});

		this._panResponder = PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetResponderCapture: () => true,
			onMoveShouldSetPanResponderCapture: (evt, gestureState) =>
				Math.abs(gestureState.dy) > 40 /*&& gestureState.dy !== 0*/,
			onPanResponderGrant: (e, gestureState) => {
				this._animatedValue.stopAnimation();
				this._animatedValue.setOffset({ x: this._value.x, y: this._value.y });
			},
			onPanResponderMove: (e, gestureState) => {
				Animated.event([null, { dy: this._animatedValue.y }])(e, gestureState);

				// Avoid last movement
				this.lockLast =
					this.state.scrollLockPage != undefined
						? -this.state.scrollLockPage
						: this.pages[this.pages.length - 1];
				if (this._value.y > this.pages[0] || this._value.y < this.lockLast) {
					this._animatedValue.setValue({ x: 0, y: 0 });
				}
			},
			onPanResponderRelease: (e, gestureState) => {
				if (Math.abs(gestureState.dy) > 20) {
					let goTo = this._closest(this._value.y + gestureState.dy);
					if (this.lockLast > goTo) return; //remove in the future

					this._animatedValue.flattenOffset({ x: this._value.x, y: this._value.y });
					Animated.spring(this._animatedValue, {
						toValue: { x: 0, y: goTo },
						friction: 3,
						tension: 0.6,
					}).start();
					setTimeout(() => {
						if (this.props.callBackAfterSwipe) this.props.callBackAfterSwipe(goTo);
					}, 500);
				}
			},
		});
	}

	componentWillReceiveProps(props) {
		this.setState({
			scrollLockPage: props.scrollLockPage ? this.pages[props.scrollLockPage] : undefined,
		});
	}

	scrollTo(page, animated) {
		animated = animated ? true : false;

		if (animated) {
			Animated.spring(this._animatedValue, {
				toValue: { x: 0, y: this.pages[page] },
				friction: 4,
				tension: 1,
			}).start();
		} else {
			this._animatedValue.setValue({ x: 0, y: this.pages[page] });
		}
	}

	_getTransformsFor = i => {
		let scrollY = this._animatedValue.y;
		let pageY = -height * i;

		let translateY = scrollY.interpolate({
			inputRange: [pageY - height, pageY, pageY + height],
			outputRange: [(-height-1) / TR_POSITION, 0, (height+1) / TR_POSITION],
			extrapolate: 'clamp',
		});

		let rotateX = scrollY.interpolate({
			inputRange: [pageY - height, pageY, pageY + height],
			outputRange: ['45deg', '0deg', '-45deg'],
			extrapolate: 'clamp',
		});

		let translateYAfterRotate = scrollY.interpolate({
			inputRange: [pageY - height, pageY, pageY + height],
			inputRange: [pageY - height, pageY - height+0.5, pageY, pageY + height-0.5, pageY + height],
			outputRange: [-height, (-height)/PESPECTIVE, 0, (height)/PESPECTIVE , +height],
			extrapolate: 'clamp',
		});

		let opacity = scrollY.interpolate({
			inputRange: [pageY - height, pageY - height + 100, pageY, pageY + height - 100, pageY + height],
			outputRange: [0, 1, 1, 1, 0],
			extrapolate: 'clamp',
		});

		return {
			transform: [
				{ perspective: height},
				{ translateY },
				{ rotateX: rotateX },
				{ translateY: translateYAfterRotate },
			],
			opacity: opacity,
		};
	};

	_renderChild = (child, i) => {
		let expandStyle = this.props.expandView
			? {  width: width, height }
			: { width, height };
		let style = [child.props.style, expandStyle];
		let props = {
			i,
			style,
		};
		let element = React.cloneElement(child, props);

		return (
			<Animated.View style={[StyleSheet.absoluteFill, this._getTransformsFor(i, false)]} key={`child- ${i}`}>
				{element}
			</Animated.View>
		);
	};

	_closest = num => {
		let array = this.pages;

		var i = 0;
		var minDiff = 1000;
		var ans;
		for (i in array) {
			var m = Math.abs(num - array[i]);
			if (m < minDiff) {
				minDiff = m;
				ans = array[i];
			}
		}
		return ans;
	};

	render() {
		let expandStyle = this.props.expandView
			? {  width: width, height }
			: { width, height };

		return (
			<Animated.View
				style={[{ position: 'absolute' }, expandStyle]}
				ref={view => {
					this._scrollView = view;
				}}
				{...this._panResponder.panHandlers}
			>
				<Animated.View style={[{ backgroundColor: 'transparent', position: 'absolute', width, height }, expandStyle]}>
					{this.props.children.map(this._renderChild)}
				</Animated.View>
			</Animated.View>
		);
	}
}

CubeNavigationVertical.propTypes = {
	callBackAfterSwipe: PropTypes.func,
	scrollLockPage: PropTypes.number,
	expandView: PropTypes.bool,
};

CubeNavigationVertical.defaultProps = {
	expandView: false,
};
