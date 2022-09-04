class Bus {
	private fileBucket: File[] = []

	pushToBucket(file: File) {
		this.fileBucket.push(file)
	}

	getFileFromBucket(): null | File {
		return this.fileBucket.shift() ?? null
	}

}

export default new Bus
